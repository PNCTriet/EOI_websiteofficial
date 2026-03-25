import { createServiceClient } from "@/lib/supabase/service";

/**
 * Allows unauthenticated calls only when no secret env is set (local dev).
 * Production: set `CRON_EXPIRE_SECRET` and/or Vercel's `CRON_SECRET` (Bearer from Vercel Cron).
 */
function authorizeCron(request: Request): boolean {
  const expire = process.env.CRON_EXPIRE_SECRET;
  const vercelCron = process.env.CRON_SECRET;
  const secrets = [expire, vercelCron].filter((s): s is string => Boolean(s));
  if (secrets.length === 0) return true;

  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice(7);
    if (secrets.includes(token)) return true;
  }
  const header = request.headers.get("x-cron-secret");
  if (header && secrets.includes(header)) return true;
  return false;
}

async function runExpire() {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: expiredIntents, error: e1 } = await supabase
    .from("payment_intents")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", now)
    .select("id");

  if (e1) {
    return Response.json({ ok: false, message: e1.message }, { status: 500 });
  }

  const { data: staleOrders, error: e2 } = await supabase
    .from("orders")
    .update({ stage: "expired" })
    .eq("stage", "pending_payment")
    .lt("expires_at", now)
    .select("id");

  if (e2) {
    return Response.json({ ok: false, message: e2.message }, { status: 500 });
  }

  if (staleOrders?.length) {
    await supabase.from("order_stage_logs").insert(
      staleOrders.map((o) => ({
        order_id: o.id,
        from_stage: "pending_payment" as const,
        to_stage: "expired" as const,
      }))
    );
  }

  return Response.json({
    ok: true,
    expiredIntents: expiredIntents?.length ?? 0,
    expiredOrders: staleOrders?.length ?? 0,
  });
}

/** Vercel Cron calls this route with GET. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runExpire();
}

/** Manual / external schedulers can use POST + x-cron-secret. */
export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runExpire();
}
