import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { sendTemplatedEmail } from "@/lib/email-center";
import {
  isTransitionAllowed,
  requiresTrackingForTransition,
} from "@/lib/order-stage-transitions";
import { createClient } from "@/lib/supabase/server";
import type { OrderStage } from "@/types/database";

type Props = { params: Promise<{ id: string }> };

const STAGES: OrderStage[] = [
  "pending_payment",
  "paid",
  "processing",
  "printing",
  "shipped",
  "delivered",
  "expired",
  "cancelled",
];

function parseStage(v: unknown): OrderStage | null {
  if (typeof v !== "string" || !STAGES.includes(v as OrderStage)) return null;
  return v as OrderStage;
}

export async function POST(request: Request, { params }: Props) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const to = parseStage(b.to);
  if (!to) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const trackingNumber =
    typeof b.tracking_number === "string" ? b.tracking_number.trim() : "";
  const shippingCarrier =
    typeof b.shipping_carrier === "string" ? b.shipping_carrier.trim() : "";

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id,stage,sepay_ref,shipping_addr")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const from = order.stage as OrderStage;
  if (!isTransitionAllowed(from, to)) {
    return NextResponse.json(
      { error: "invalid_transition", from, to },
      { status: 400 }
    );
  }

  if (requiresTrackingForTransition(to)) {
    if (!trackingNumber || !shippingCarrier) {
      return NextResponse.json(
        { error: "tracking_required", message: "Carrier and tracking number required" },
        { status: 400 }
      );
    }
  }

  const updatePayload: Record<string, unknown> = { stage: to };
  if (to === "shipped") {
    updatePayload.tracking_number = trackingNumber;
    updatePayload.shipping_carrier = shippingCarrier;
  }

  const { error: upErr } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { error: logErr } = await supabase.from("order_stage_logs").insert({
    order_id: orderId,
    from_stage: from,
    to_stage: to,
  });

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  if (to === "shipped") {
    const addr = order.shipping_addr as Record<string, unknown> | null;
    const email = typeof addr?.email === "string" ? addr.email.trim() : "";
    if (email) {
      await sendTemplatedEmail({
        to: email,
        templateKey: "order_shipped",
        orderId,
        variables: {
          order_ref: order.sepay_ref ?? orderId,
          shipping_carrier: shippingCarrier,
          tracking_number: trackingNumber,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, stage: to });
}
