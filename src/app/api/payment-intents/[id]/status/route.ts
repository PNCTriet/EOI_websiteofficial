import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const access = new URL(request.url).searchParams.get("access") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("payment_intents")
      .select("id,status,order_id,expires_at,sepay_ref,amount")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) return NextResponse.json(data);
  }

  if (access.length > 0) {
    const admin = createServiceClient();
    const { data } = await admin
      .from("payment_intents")
      .select(
        "id,status,order_id,expires_at,sepay_ref,amount,hidden_from_account_list,link_access_token",
      )
      .eq("id", id)
      .maybeSingle();
    if (
      data &&
      data.hidden_from_account_list &&
      data.link_access_token &&
      data.link_access_token === access
    ) {
      return NextResponse.json({
        id: data.id,
        status: data.status,
        order_id: data.order_id,
        expires_at: data.expires_at,
        sepay_ref: data.sepay_ref,
        amount: data.amount,
      });
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
