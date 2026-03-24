import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("id,stage,paid_at,expires_at,sepay_ref,total_amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
