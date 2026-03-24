import { createServiceClient } from "@/lib/supabase/service";

/**
 * Internal endpoint for cron: expire pending_payment orders past expires_at.
 * Protect via x-cron-secret header.
 */
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
  const { data: expiredOrders, error } = await supabase
    .from("orders")
    .update({ stage: "expired" })
    .eq("stage", "pending_payment")
    .lt("expires_at", now)
    .select("id");

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (expiredOrders?.length) {
    await supabase.from("order_stage_logs").insert(
      expiredOrders.map((o) => ({
        order_id: o.id,
        from_stage: "pending_payment" as const,
        to_stage: "expired" as const,
      }))
    );
  }

  return Response.json({ ok: true, expired: expiredOrders?.length ?? 0 });
}
