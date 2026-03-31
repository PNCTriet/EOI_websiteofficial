import { createHmac } from "crypto";
import { sendTemplatedEmail } from "@/lib/email-center";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";
import { brandAssets } from "@/lib/brand-assets";
import { formatShippingAddrLines, parseShippingAddr } from "@/lib/order-shipping";
import { logEvent } from "@/lib/logging";

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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rawBody = await request.text();
  const signature = request.headers.get("x-payment-signature");
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (secret) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!signature || signature !== expected) {
      logEvent("webhook.payment.invalid_signature", { ip });
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let body: PaymentWebhook;
  try {
    body = JSON.parse(rawBody) as PaymentWebhook;
  } catch {
    logEvent("webhook.payment.bad_json", { ip });
    return Response.json({ received: true });
  }
  logEvent("webhook.payment.received", { ip });

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

  if (!refMatch || amount == null) {
    logEvent("webhook.payment.no_ref_or_amount", { ip });
    return Response.json({ received: true, matched: false });
  }
  const ref = `EOI-${refMatch[1]}`;

  const { data: intent } = await supabase
    .from("payment_intents")
    .select(
      "id,user_id,sepay_ref,amount,cart_snapshot,shipping_addr,note,expires_at,status,order_id,hidden_from_account_list,link_access_token",
    )
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
      logEvent("webhook.payment.intent_not_found", { ip, ref });
      return Response.json({ received: true, matched: false, reason: "intent_not_found", ref });
    }
    if (existingIntent.status === "paid" && existingIntent.order_id) {
      logEvent("webhook.payment.already_paid", { ip, ref, orderId: existingIntent.order_id });
      return Response.json({
        received: true,
        matched: true,
        duplicate: true,
        reason: "already_paid",
        orderId: existingIntent.order_id,
      });
    }
    logEvent("webhook.payment.intent_not_pending", { ip, ref, status: existingIntent.status });
    return Response.json({
      received: true,
      matched: false,
      reason: "intent_not_pending",
      status: existingIntent.status,
      ref,
    });
  }
  if (Math.abs(Number(intent.amount) - amount) > 1000) {
    logEvent("webhook.payment.amount_mismatch", {
      ip,
      ref,
      expectedAmount: Number(intent.amount),
      receivedAmount: amount,
    });
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
  const intentRow = intent as typeof intent & {
    hidden_from_account_list?: boolean;
    link_access_token?: string | null;
  };
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
      hidden_from_account_list: intentRow.hidden_from_account_list ?? false,
      link_access_token: intentRow.link_access_token ?? null,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    logEvent("webhook.payment.order_create_failed", { ip, ref });
    return Response.json({ received: true, matched: false, reason: "order_create_failed" });
  }

  const snapshot = Array.isArray(intent.cart_snapshot) ? intent.cart_snapshot : [];
  const orderItems: Array<{
    order_id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    unit_price: number;
    product_name_snapshot: string | null;
    variant_label_snapshot: string | null;
    variant_image_snapshot: string | null;
  }> = [];

  const productIds: string[] = [];
  for (const row of snapshot) {
    if (!row || typeof row !== "object") continue;
    const data = row as { productId?: unknown; quantity?: unknown };
    const pid = typeof data.productId === "string" ? data.productId : null;
    if (pid) productIds.push(pid);
  }
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length > 0) {
    const { data: productRows } = await supabase
      .from("products")
      .select("id,name,price")
      .in("id", uniqueIds);
    const productMap = new Map((productRows ?? []).map((p) => [p.id, p]));

    for (const row of snapshot) {
      if (!row || typeof row !== "object") continue;
      const data = row as {
        productId?: unknown;
        variantId?: unknown;
        variantLabel?: unknown;
        variantImageUrl?: unknown;
        quantity?: unknown;
        price?: unknown;
        name?: unknown;
      };
      const productId = typeof data.productId === "string" ? data.productId : null;
      const variantId = typeof data.variantId === "string" ? data.variantId : null;
      const variantLabel =
        typeof data.variantLabel === "string" ? data.variantLabel.trim() : "";
      const variantImageUrl =
        typeof data.variantImageUrl === "string" ? data.variantImageUrl.trim() : "";
      const quantity = typeof data.quantity === "number" ? data.quantity : Number(data.quantity);
      if (!productId || !variantId || !Number.isFinite(quantity) || quantity <= 0) continue;
      const prod = productMap.get(productId);
      if (!prod || prod.price == null) continue;
      const fromSnapshotPrice =
        typeof data.price === "number" && Number.isFinite(data.price) ? data.price : null;
      const fromSnapshotName = typeof data.name === "string" ? data.name : null;
      const displayName = fromSnapshotName ?? prod.name;
      const label = variantLabel || "—";
      orderItems.push({
        order_id: order.id,
        product_id: productId,
        variant_id: variantId,
        quantity: Math.floor(quantity),
        unit_price: fromSnapshotPrice ?? prod.price,
        product_name_snapshot: displayName,
        variant_label_snapshot: label,
        variant_image_snapshot: variantImageUrl || null,
      });
    }
  }

  if (orderItems.length > 0) {
    const { error: itemErr } = await supabase.from("order_items").insert(orderItems);
    if (itemErr) {
      logEvent("webhook.payment.order_items_create_failed", { ip, ref });
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

  const shippingAddr = intent.shipping_addr as Record<string, unknown> | null;
  const email = typeof shippingAddr?.email === "string" ? shippingAddr.email.trim() : "";
  if (email) {
    const addr = parseShippingAddr(intent.shipping_addr as Json | null);
    const shipping_address = formatShippingAddrLines(addr, "vi");
    const recipient_name = addr?.recipient_name?.trim() || email.split("@")[0] || "Customer";
    const phone = addr?.phone?.trim() || "";

    await sendTemplatedEmail({
      to: email,
      templateKey: "order_created",
      orderId: order.id,
      variables: {
        order_ref: intent.sepay_ref ?? order.id,
        order_total: Number(intent.amount),
        recipient_name,
        shipping_address,
        phone,
        site_url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        logo_url: brandAssets.logoTransparent,
      },
    });

    await sendTemplatedEmail({
      to: email,
      templateKey: "order_paid",
      orderId: order.id,
      variables: {
        order_ref: intent.sepay_ref,
        order_total: Number(intent.amount),
      },
    });
  }
  logEvent("webhook.payment.matched", { ip, ref, orderId: order.id });
  return Response.json({ received: true, matched: true, orderId: order.id });
}
