import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

type PaymentWebhook = {
  amount?: number | string;
  transferAmount?: number | string;
  content?: string;
  description?: string;
  [k: string]: unknown;
};

function parseAmount(v: PaymentWebhook): number | null {
  const raw = v.transferAmount ?? v.amount;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-payment-signature");
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (secret) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!signature || signature !== expected) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: PaymentWebhook;
  try {
    body = JSON.parse(rawBody) as PaymentWebhook;
  } catch {
    return Response.json({ received: true });
  }

  const supabase = createServiceClient();
  const amount = parseAmount(body);
  const content = String(body.content ?? body.description ?? "").toUpperCase();
  const refMatch = content.match(/EOI-?([A-Z0-9]{6})/);

  const { data: log } = await supabase
    .from("sepay_logs")
    .insert({
      raw_payload: body as Json,
      amount,
      matched: false,
    })
    .select("id")
    .single();

  if (!refMatch || amount == null) return Response.json({ received: true, matched: false });
  const ref = `EOI-${refMatch[1]}`;

  const { data: intent } = await supabase
    .from("payment_intents")
    .select("id,user_id,sepay_ref,amount,cart_snapshot,shipping_addr,note,expires_at,status,order_id")
    .eq("sepay_ref", ref)
    .eq("status", "pending")
    .maybeSingle();
  if (!intent) {
    const { data: existingIntent } = await supabase
      .from("payment_intents")
      .select("id,status,order_id,amount")
      .eq("sepay_ref", ref)
      .maybeSingle();
    if (!existingIntent) {
      return Response.json({ received: true, matched: false, reason: "intent_not_found", ref });
    }
    if (existingIntent.status === "paid" && existingIntent.order_id) {
      return Response.json({
        received: true,
        matched: true,
        duplicate: true,
        reason: "already_paid",
        orderId: existingIntent.order_id,
      });
    }
    return Response.json({
      received: true,
      matched: false,
      reason: "intent_not_pending",
      status: existingIntent.status,
      ref,
    });
  }
  if (Math.abs(Number(intent.amount) - amount) > 1000) {
    return Response.json({
      received: true,
      matched: false,
      reason: "amount_mismatch",
      expectedAmount: Number(intent.amount),
      receivedAmount: amount,
      ref,
    });
  }

  const paidAt = new Date().toISOString();
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: intent.user_id,
      total_amount: intent.amount,
      stage: "paid",
      paid_at: paidAt,
      sepay_ref: intent.sepay_ref,
      shipping_addr: intent.shipping_addr,
      note: intent.note,
      payment_method: "bank_transfer",
      expires_at: intent.expires_at,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    return Response.json({ received: true, matched: false, reason: "order_create_failed" });
  }

  const snapshot = Array.isArray(intent.cart_snapshot) ? intent.cart_snapshot : [];
  const orderItems: Array<{
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    product_name_snapshot: string | null;
  }> = [];
  for (const row of snapshot) {
    if (!row || typeof row !== "object") continue;
    const data = row as { productId?: unknown; quantity?: unknown; price?: unknown; name?: unknown };
    const productId = typeof data.productId === "string" ? data.productId : null;
    const quantity = typeof data.quantity === "number" ? data.quantity : Number(data.quantity);
    const unitPrice = typeof data.price === "number" ? data.price : Number(data.price);
    const name = typeof data.name === "string" ? data.name : null;
    if (!productId || !Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0) continue;
    orderItems.push({
      order_id: order.id,
      product_id: productId,
      quantity,
      unit_price: unitPrice,
      product_name_snapshot: name,
    });
  }

  if (orderItems.length > 0) {
    const { error: itemErr } = await supabase.from("order_items").insert(orderItems);
    if (itemErr) {
      return Response.json({ received: true, matched: false, reason: "order_items_create_failed" });
    }
  }

  await supabase.from("order_stage_logs").insert({
    order_id: order.id,
    from_stage: null,
    to_stage: "paid",
  });
  await supabase
    .from("payment_intents")
    .update({ status: "paid", order_id: order.id })
    .eq("id", intent.id);
  if (log) {
    await supabase.from("sepay_logs").update({ matched: true, order_id: order.id }).eq("id", log.id);
  }
  return Response.json({ received: true, matched: true, orderId: order.id });
}
