"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { EoiLogo } from "@/components/eoi-logo";
import { useTranslations } from "@/components/locale-provider";
import { createClient } from "@/lib/supabase/client";
import { Chrome, Facebook } from "lucide-react";

export default function StoreLoginPage() {
  const t = useTranslations();
  const search = useSearchParams();
  const nextPath = search.get("next") ?? "/account";
  const authFailed = search.get("error") === "auth_failed";
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(
    null
  );

  async function signInWithProvider(provider: "google" | "facebook") {
    setError(null);
    setLoadingProvider(provider);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextPath
          )}`,
        },
      });
      if (signErr) {
        setError(signErr.message);
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-eoi-bg px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-eoi-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <EoiLogo heightClass="h-14" />
        </div>
        <h1 className="mt-3 text-center font-syne text-xl font-bold text-eoi-ink">
          {t("storeLogin.title")}
        </h1>
        <p className="mt-1 text-center font-dm text-sm text-eoi-ink2">
          {t("storeLogin.subtitle")}
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => void signInWithProvider("google")}
            disabled={loadingProvider !== null}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-eoi-border bg-white px-4 py-3 font-dm text-sm font-medium text-eoi-ink disabled:opacity-60"
          >
            <Chrome size={18} strokeWidth={2} />
            {loadingProvider === "google"
              ? t("storeLogin.redirecting")
              : t("storeLogin.continueWithGoogle")}
          </button>
          <button
            type="button"
            onClick={() => void signInWithProvider("facebook")}
            disabled={loadingProvider !== null}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-eoi-border bg-white px-4 py-3 font-dm text-sm font-medium text-eoi-ink disabled:opacity-60"
          >
            <Facebook size={18} strokeWidth={2} />
            {loadingProvider === "facebook"
              ? t("storeLogin.redirecting")
              : t("storeLogin.continueWithFacebook")}
          </button>
        </div>

        {authFailed ? (
          <p className="mt-4 font-dm text-xs text-red-600" role="alert">
            {t("storeLogin.authFailed")}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 font-dm text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
