"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EoiLogo } from "@/components/eoi-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "@/components/locale-provider";
import { isUserAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <div className="w-full max-w-md rounded-2xl border border-eoi-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <EoiLogo heightClass="h-14" />
          <LanguageSwitcher />
        </div>
        <p className="mt-2 text-center font-dm text-xs font-medium uppercase tracking-wider text-eoi-ink2">
          {t("login.adminBadge")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
