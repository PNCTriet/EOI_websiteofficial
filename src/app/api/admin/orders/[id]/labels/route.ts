import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("order_labels")
    .select("label_id, labels(id,name,color)")
    .eq("order_id", orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const labels = (data ?? [])
    .map((row) => row.labels)
    .filter(Boolean);
  return NextResponse.json({ labels });
}

export async function POST(request: Request, { params }: Props) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const labelId = typeof b.label_id === "string" ? b.label_id : "";
  if (!labelId) {
    return NextResponse.json({ error: "label_id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("order_labels").upsert(
    {
      order_id: orderId,
      label_id: labelId,
      tagged_by: user?.id ?? null,
    },
    { onConflict: "order_id,label_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
