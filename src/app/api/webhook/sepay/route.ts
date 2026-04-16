import { createClient } from "@supabase/supabase-js";
import type { Database, Json, OrderRow } from "@/types/database";
import { logEvent } from "@/lib/logging";
import { makeRateLimit } from "@/lib/rate-limit";
import { sendTemplatedEmail } from "@/lib/email-center";
import { formatOrderLinesHtmlVi } from "@/lib/email-order-lines";
import { formatShippingAddrLines, parseShippingAddr } from "@/lib/order-shipping";
import { brandAssets } from "@/lib/brand-assets";

type SePayBody = {
  transferAmount?: number;
  amount?: number;
  content?: string;
  description?: string;
  [key: string]: Json | undefined;
};

function parseAmount(body: SePayBody): number | null {
  const n = body.transferAmount ?? body.amount;
  if (typeof n === "number" && !Number.isNaN(n)) return n;
  if (typeof n === "string") {
    const p = Number(n);
    return Number.isNaN(p) ? null : p;
  }
  return null;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rateLimit = makeRateLimit({ windowMs: 60_000, max: 20 });
  const rl = rateLimit(`sepay:${ip}`);
  if (!rl.allowed) {
    logEvent("rate_limited.webhook_sepay", { ip, retryAfterSeconds: rl.retryAfterSeconds });
    return new Response(JSON.stringify({ success: false }), {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  let body: SePayBody;
  try {
    body = (await request.json()) as SePayBody;
  } catch {
    logEvent("webhook_sepay.bad_json", { ip });
    return Response.json({ success: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    logEvent("webhook_sepay.missing_supabase_service_role");
    return Response.json({ success: true });
  }

  const supabase = createClient<Database>(url, key);

  const incomingAmount = parseAmount(body);
  let matched = false;
  let reason = "ignored";
  let matchedRef: string | null = null;
  let matchedOrderId: string | null = null;

  const { data: logRow, error: logErr } = await supabase
    .from("sepay_logs")
    .insert({
      raw_payload: body as Json,
      amount: incomingAmount,
      matched: false,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const logId = !logErr && logRow ? logRow.id : null;

  const content = String(body.content ?? body.description ?? "");
  const refMatch = content.match(/EOI-?([A-Z0-9]{6})\b/i);

  if (refMatch && incomingAmount !== null) {
    const sepayRef = `EOI-${refMatch[1]?.toUpperCase() ?? ""}`;
    matchedRef = sepayRef;

    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("sepay_ref", sepayRef)
      .eq("stage", "pending_payment")
      .maybeSingle();

    const order = orderData as OrderRow | null;

    if (order) {
      if (Math.abs(incomingAmount - order.total_amount) <= 1000) {
        const paidAt = new Date().toISOString();
        await supabase
          .from("orders")
          .update({
            stage: "paid",
            paid_at: paidAt,
          })
          .eq("id", order.id);

        await supabase.from("order_stage_logs").insert({
          order_id: order.id,
          from_stage: "pending_payment",
          to_stage: "paid",
        });

        if (logId) {
          await supabase
            .from("sepay_logs")
            .update({ order_id: order.id, matched: true })
            .eq("id", logId);
        }
        matched = true;
        matchedOrderId = order.id;
        reason = "paid";

        const { data: itemRows } = await supabase
          .from("order_items")
          .select("product_name_snapshot,variant_label_snapshot,quantity,unit_price")
          .eq("order_id", order.id);
        const addrRaw = order.shipping_addr as Record<string, unknown> | null;
        const email = typeof addrRaw?.email === "string" ? addrRaw.email.trim() : "";
        if (email) {
          const addr = parseShippingAddr(order.shipping_addr as Json | null);
          const recipientName = addr?.recipient_name?.trim() || email.split("@")[0] || "Customer";
          const shippingAddress = formatShippingAddrLines(addr, "vi");
          const phone = addr?.phone?.trim() || "";
          const orderLinesHtml = formatOrderLinesHtmlVi(
            (itemRows ?? []).map((it) => ({
              name: it.product_name_snapshot ?? "—",
              variant_label: it.variant_label_snapshot,
              quantity: Number(it.quantity ?? 0),
              unit_price: Number(it.unit_price ?? 0),
            })),
          );
          const orderTotalDisplay = `${Number(order.total_amount).toLocaleString("vi-VN")}đ`;

          await sendTemplatedEmail({
            to: email,
            templateKey: "order_created",
            orderId: order.id,
            variables: {
              order_ref: order.sepay_ref ?? order.id,
              order_total: Number(order.total_amount),
              order_total_display: orderTotalDisplay,
              order_lines_html: orderLinesHtml,
              recipient_name: recipientName,
              shipping_address: shippingAddress,
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
              order_ref: order.sepay_ref ?? order.id,
              order_total: Number(order.total_amount),
              order_total_display: orderTotalDisplay,
              order_lines_html: orderLinesHtml,
            },
          });
        }
      } else {
        reason = "amount_mismatch";
      }
    } else {
      reason = "pending_order_not_found";
    }
  } else if (!refMatch) {
    reason = "ref_not_found";
  } else {
    reason = "amount_invalid";
  }

  return Response.json({
    success: true,
    matched,
    reason,
    ref: matchedRef,
    order_id: matchedOrderId,
  });
}
