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

  const { data } = await supabase
    .from("payment_intents")
    .select("id,status,order_id,expires_at,sepay_ref,amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
