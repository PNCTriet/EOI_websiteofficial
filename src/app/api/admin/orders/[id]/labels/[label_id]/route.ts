import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string; label_id: string }> };

export async function DELETE(_request: Request, { params }: Props) {
  const { id: orderId, label_id: labelId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("order_labels")
    .delete()
    .eq("order_id", orderId)
    .eq("label_id", labelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
