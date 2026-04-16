import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const purchasePrice = Number(b.purchase_price);
  const purchasedAt = typeof b.purchased_at === "string" ? b.purchased_at : "";
  if (!name || !Number.isFinite(purchasePrice) || !purchasedAt) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = {
    campaign_id: typeof b.campaign_id === "string" ? b.campaign_id : null,
    name,
    purchase_price: purchasePrice,
    purchased_at: purchasedAt,
    expected_life_months:
      Number.isFinite(Number(b.expected_life_months)) && Number(b.expected_life_months) > 0
        ? Number(b.expected_life_months)
        : null,
    status: typeof b.status === "string" && b.status ? b.status : "active",
  };

  const { data, error } = await supabase
    .from("equipment_assets")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ equipment_asset: data }, { status: 201 });
}
