import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { formatShippingAddrLines, parseShippingAddr } from "@/lib/order-shipping";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import type { Json, OrderStage } from "@/types/database";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const locale = await getLocale();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id, sepay_ref, stage, total_amount, shipping_addr, note")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name_snapshot, variant_label_snapshot, quantity, unit_price")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  const addr = parseShippingAddr(order.shipping_addr as Json | null);
  const addressText = formatShippingAddrLines(addr, locale);

  return NextResponse.json({
    order: {
      id: order.id,
      sepay_ref: order.sepay_ref,
      stage: order.stage as OrderStage,
      total_amount: order.total_amount,
      note: order.note,
    },
    contact: {
      recipient_name: addr?.recipient_name?.trim() ?? "",
      email: addr?.email?.trim() ?? "",
      phone: addr?.phone?.trim() ?? "",
      addressText,
    },
    items: (items ?? []).map((it) => ({
      name: it.product_name_snapshot ?? "—",
      variant: it.variant_label_snapshot?.trim() ?? "",
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
  });
}
