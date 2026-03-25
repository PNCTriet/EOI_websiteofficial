import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [{ data: logs }, { data: campaigns }] = await Promise.all([
    supabase
      .from("email_logs")
      .select("id,status,recipient_email,subject,created_at,provider_message_id,event_type")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("email_campaigns")
      .select("id,name,status,recipient_count,sent_count,failed_count,sent_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const counts = (logs ?? []).reduce<Record<string, number>>((acc, x) => {
    acc[x.status] = (acc[x.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    counts,
    logs: logs ?? [],
    campaigns: campaigns ?? [],
  });
}
