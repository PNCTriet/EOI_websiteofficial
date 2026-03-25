import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { makeRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logging";

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const rateLimit = makeRateLimit({ windowMs: 60_000, max: 30 });
  const rl = rateLimit(`auth_callback:${ip}`);
  if (!rl.allowed) {
    logEvent("rate_limited.auth_callback", { ip, retryAfterSeconds: rl.retryAfterSeconds });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logEvent("auth_callback.ok", { ip, next });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  logEvent("auth_callback.failed", { ip, next });
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
