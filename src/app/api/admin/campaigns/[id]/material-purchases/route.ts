import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const materialName = typeof b.material_name === "string" ? b.material_name.trim() : "";
  const unit = typeof b.unit === "string" ? b.unit.trim() : "";
  const quantity = Number(b.quantity);
  const unitPrice = Number(b.unit_price);
  const purchasedAt = typeof b.purchased_at === "string" ? b.purchased_at : "";

  if (!materialName || !unit || !Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !purchasedAt) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = {
    campaign_id: campaignId,
    material_name: materialName,
    supplier: typeof b.supplier === "string" ? b.supplier.trim() || null : null,
    quantity,
    unit,
    unit_price: unitPrice,
    purchased_at: purchasedAt,
    note: typeof b.note === "string" ? b.note.trim() || null : null,
  };

  const { data, error } = await supabase
    .from("material_purchases")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ material_purchase: data }, { status: 201 });
}
