import { createServiceClient } from "@/lib/supabase/service";

/** Internal endpoint for cron: expire stale payment intents. */
export async function POST(request: Request) {
  const secret = process.env.CRON_EXPIRE_SECRET;
  if (secret) {
    const incoming = request.headers.get("x-cron-secret");
    if (incoming !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data: expiredIntents, error } = await supabase
    .from("payment_intents")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", now)
    .select("id");

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, expired: expiredIntents?.length ?? 0 });
}
