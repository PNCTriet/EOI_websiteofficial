import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/api-auth";
import { generateSepayRef } from "@/lib/order-ref";
import { createClient } from "@/lib/supabase/server";
import type { OrderStage } from "@/types/database";

type PosItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name_snapshot?: string | null;
};

type PosMode = "offline" | "online";

const CASH_STAGE: OrderStage = "paid";
const QR_STAGE: OrderStage = "pending_payment";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdminOrStaff(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const items = Array.isArray(b.items) ? (b.items as PosItemInput[]) : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const mode: PosMode = b.mode === "online" ? "online" : "offline";
  const paymentMethodRaw = typeof b.payment_method === "string" ? b.payment_method : "cash";
  const paymentMethod =
    mode === "online" ? "bank_transfer" : paymentMethodRaw === "cash" ? "cod" : "bank_transfer";
  const stage =
    mode === "online"
      ? QR_STAGE
      : paymentMethodRaw === "cash"
        ? CASH_STAGE
        : QR_STAGE;
  const campaignId = typeof b.campaign_id === "string" ? b.campaign_id : null;
  const recipientName = typeof b.recipient_name === "string" ? b.recipient_name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const phone = typeof b.phone === "string" ? b.phone.trim() : "";
  const street = typeof b.street === "string" ? b.street.trim() : "";
  const ward = typeof b.ward === "string" ? b.ward.trim() : "";
  const district = typeof b.district === "string" ? b.district.trim() : "";
  const province = typeof b.province === "string" ? b.province.trim() : "";
  const note = typeof b.note === "string" ? b.note.trim() : "";

  if (!recipientName) {
    return NextResponse.json({ error: "recipient_name_required" }, { status: 400 });
  }
  if (mode === "online") {
    if (!email || !phone || !street || !ward || !district || !province) {
      return NextResponse.json({ error: "online_shipping_required" }, { status: 400 });
    }
  }

  const normalized = items
    .map((it) => ({
      product_id: String(it.product_id),
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      product_name_snapshot:
        typeof it.product_name_snapshot === "string" ? it.product_name_snapshot : null,
    }))
    .filter((it) => it.product_id && Number.isFinite(it.quantity) && it.quantity > 0 && Number.isFinite(it.unit_price));

  if (normalized.length === 0) {
    return NextResponse.json({ error: "invalid items" }, { status: 400 });
  }

  const totalAmount = normalized.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const ref = generateSepayRef();
  const paidAt = stage === "paid" ? new Date().toISOString() : null;
  const expiresAt = stage === "pending_payment" ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      sepay_ref: ref,
      total_amount: totalAmount,
      stage,
      paid_at: paidAt,
      payment_method: paymentMethod,
      source: mode === "online" ? "online" : "pos",
      staff_id: user?.id ?? null,
      campaign_id: campaignId,
      user_id: user?.id ?? null,
      customer_id: null,
      expires_at: expiresAt,
      shipping_addr: {
        recipient_name: recipientName,
        email: email || null,
        phone: phone || null,
        street: street || null,
        ward: ward || null,
        district: district || null,
        province: province || null,
      },
      note: note || null,
    })
    .select("id,sepay_ref,total_amount,stage,payment_method,expires_at")
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? "could not create order" }, { status: 500 });
  }

  const orderItems = normalized.map((it) => ({
    order_id: order.id,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
    product_name_snapshot: it.product_name_snapshot,
  }));
  const { error: itemErr } = await supabase.from("order_items").insert(orderItems);
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  const { error: logErr } = await supabase.from("order_stage_logs").insert({
    order_id: order.id,
    from_stage: null,
    to_stage: stage,
  });
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  return NextResponse.json({ order }, { status: 201 });
}
