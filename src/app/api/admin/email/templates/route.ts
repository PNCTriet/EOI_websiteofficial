import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("email_templates")
    .select("key,name,subject,html,enabled,updated_at")
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    key?: string;
    name?: string;
    subject?: string;
    html?: string;
    enabled?: boolean;
  };

  const key = body.key?.trim();
  if (!key || !body.name?.trim() || !body.subject?.trim() || !body.html?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase.from("email_templates").upsert(
    {
      key,
      name: body.name.trim(),
      subject: body.subject.trim(),
      html: body.html,
      enabled: body.enabled ?? true,
      updated_by: user.id,
    },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
