"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/components/locale-provider";

export function AccountSignOutButton() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={loading}
      className="rounded-full border border-eoi-border px-4 py-2 font-dm text-sm text-eoi-ink disabled:opacity-60"
    >
      {loading ? t("login.signingIn") : t("nav.logout")}
    </button>
  );
}
