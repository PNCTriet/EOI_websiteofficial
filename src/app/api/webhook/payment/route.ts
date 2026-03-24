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
  const refMatch = content.match(/EOI-[A-Z0-9]{6}/);

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
  const ref = refMatch[0];

  const { data: order } = await supabase
    .from("orders")
    .select("id,total_amount,stage")
    .eq("sepay_ref", ref)
    .eq("stage", "pending_payment")
    .maybeSingle();
  if (!order) return Response.json({ received: true, matched: false });
  if (Math.abs(Number(order.total_amount) - amount) > 1000) {
    return Response.json({ received: true, matched: false, reason: "amount_mismatch" });
  }

  await supabase
    .from("orders")
    .update({ stage: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id);
  await supabase.from("order_stage_logs").insert({
    order_id: order.id,
    from_stage: "pending_payment",
    to_stage: "paid",
  });
  if (log) {
    await supabase.from("sepay_logs").update({ matched: true, order_id: order.id }).eq("id", log.id);
  }
  return Response.json({ received: true, matched: true, orderId: order.id });
}
