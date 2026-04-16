import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
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
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.description === "string" || b.description === null) patch.description = b.description;
  if (typeof b.started_at === "string" || b.started_at === null) patch.started_at = b.started_at;
  if (typeof b.ended_at === "string" || b.ended_at === null) patch.ended_at = b.ended_at;
  if (typeof b.status === "string") patch.status = b.status;

  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("id", id)
    .select("id,name,description,started_at,ended_at,status,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
