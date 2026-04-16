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
  const category = typeof b.category === "string" ? b.category.trim() : "";
  const amount = Number(b.amount);
  const costDate = typeof b.cost_date === "string" ? b.cost_date : "";
  if (!category || !Number.isFinite(amount) || !costDate) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = {
    campaign_id: campaignId,
    category,
    amount,
    cost_date: costDate,
    note: typeof b.note === "string" ? b.note.trim() || null : null,
  };
  const { data, error } = await supabase
    .from("operational_costs")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ operational_cost: data }, { status: 201 });
}
