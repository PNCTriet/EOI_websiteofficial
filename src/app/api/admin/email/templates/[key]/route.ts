import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ key: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const { key } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    name?: string;
    subject?: string;
    html?: string;
    enabled?: boolean;
  };

  const payload: Record<string, unknown> = { updated_by: user.id };
  if (typeof body.name === "string") payload.name = body.name.trim();
  if (typeof body.subject === "string") payload.subject = body.subject.trim();
  if (typeof body.html === "string") payload.html = body.html;
  if (typeof body.enabled === "boolean") payload.enabled = body.enabled;

  const { error } = await supabase.from("email_templates").update(payload).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
