"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome } from "lucide-react";
import { EoiLogo } from "@/components/eoi-logo";
import { useTranslations } from "@/components/locale-provider";
import { isUserAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const search = useSearchParams();
  const errorParam = search.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signedOutNotice, setSignedOutNotice] = useState(false);

  const queryError =
    errorParam === "not_admin"
      ? t("login.notAdminError")
      : errorParam === "auth_failed"
        ? t("login.authFailed")
        : null;

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
      const { error: signErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/admin")}`,
        },
      });
      if (signErr) {
        setError(signErr.message);
        setGoogleLoading(false);
      }
    } catch {
      setGoogleLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSignedOutNotice(true);
    router.replace("/admin/login");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      if (!isUserAdmin(data.user)) {
        await supabase.auth.signOut();
        setError(t("login.notAdminError"));
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-eoi-bg px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-eoi-border bg-eoi-surface p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <EoiLogo heightClass="h-14" />
        </div>
        <p className="mt-2 text-center font-dm text-xs font-medium uppercase tracking-wider text-eoi-ink2">
          {t("login.adminBadge")}
        </p>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            disabled={googleLoading || loading}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-eoi-border bg-white px-4 py-3 font-dm text-sm font-medium text-eoi-ink disabled:opacity-60"
          >
            <Chrome size={18} strokeWidth={2} />
            {googleLoading ? t("login.redirecting") : t("login.continueWithGoogle")}
          </button>
        </div>

        {queryError && !signedOutNotice ? (
          <div className="mt-4 space-y-2" role="alert">
            <p className="font-dm text-xs text-red-600">{queryError}</p>
            {errorParam === "not_admin" ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="font-dm text-xs font-medium text-eoi-ink underline"
              >
                {t("login.signOut")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-eoi-border" />
          <span className="font-dm text-xs uppercase tracking-wider text-eoi-ink2">
            {t("login.or")}
          </span>
          <span className="h-px flex-1 bg-eoi-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="font-dm text-xs font-medium text-eoi-ink2">
              {t("login.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30"
            />
          </div>
          <div>
            <label htmlFor="password" className="font-dm text-xs font-medium text-eoi-ink2">
              {t("login.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full min-h-[44px] rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30"
            />
          </div>
          {error ? (
            <p className="font-dm text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] rounded-full bg-eoi-ink py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? t("login.signingIn") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
