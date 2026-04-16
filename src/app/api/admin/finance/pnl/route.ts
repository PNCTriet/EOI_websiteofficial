import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { OrderStage } from "@/types/database";

const VALID_REVENUE_STAGES: OrderStage[] = [
  "paid",
  "processing",
  "printing",
  "shipped",
  "delivered",
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaign_id");

  let revenue = 0;
  let materialCost = 0;
  let operationalCost = 0;
  let equipmentCost = 0;

  const ordersQuery = supabase
    .from("orders")
    .select("total_amount")
    .in("stage", VALID_REVENUE_STAGES);
  if (campaignId) ordersQuery.eq("campaign_id", campaignId);
  const { data: orders, error: orderErr } = await ordersQuery;
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });
  for (const row of orders ?? []) revenue += Number(row.total_amount ?? 0);

  const materialQuery = supabase.from("material_purchases").select("total_price");
  if (campaignId) materialQuery.eq("campaign_id", campaignId);
  const { data: materials, error: matErr } = await materialQuery;
  if (matErr) return NextResponse.json({ error: matErr.message }, { status: 500 });
  for (const row of materials ?? []) materialCost += Number(row.total_price ?? 0);

  const opQuery = supabase.from("operational_costs").select("amount");
  if (campaignId) opQuery.eq("campaign_id", campaignId);
  const { data: costs, error: opErr } = await opQuery;
  if (opErr) return NextResponse.json({ error: opErr.message }, { status: 500 });
  for (const row of costs ?? []) operationalCost += Number(row.amount ?? 0);

  const assetQuery = supabase.from("equipment_assets").select(
    "purchase_price, expected_life_months, purchased_at, status"
  );
  if (campaignId) assetQuery.eq("campaign_id", campaignId);
  const { data: assets, error: assetErr } = await assetQuery;
  if (assetErr) return NextResponse.json({ error: assetErr.message }, { status: 500 });

  const now = new Date();
  for (const row of assets ?? []) {
    if (row.status && row.status !== "active") continue;
    const price = Number(row.purchase_price ?? 0);
    const lifeMonths = Number(row.expected_life_months ?? 0);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(lifeMonths) || lifeMonths <= 0) {
      continue;
    }
    const purchasedAt = new Date(row.purchased_at);
    const elapsedMonths = Math.max(
      0,
      (now.getFullYear() - purchasedAt.getFullYear()) * 12 + (now.getMonth() - purchasedAt.getMonth())
    );
    const depreciatedMonths = Math.min(lifeMonths, elapsedMonths + 1);
    const monthly = price / lifeMonths;
    equipmentCost += monthly * depreciatedMonths;
  }

  const profit = revenue - materialCost - operationalCost - equipmentCost;
  return NextResponse.json({
    revenue,
    material_cost: materialCost,
    operational_cost: operationalCost,
    equipment_cost: equipmentCost,
    profit,
  });
}
