"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/components/locale-provider";

type Props = {
  userId: string;
  initialFullName: string;
  initialPhone: string;
};

export function AccountProfileForm({ userId, initialFullName, initialPhone }: Props) {
  const t = useTranslations();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("user_profiles").upsert({
      id: userId,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(t("account.saved"));
  }

  return (
    <form onSubmit={onSave} className="mt-4 space-y-3">
      <div>
        <label className="font-dm text-xs font-medium text-eoi-ink2">{t("account.fullName")}</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-eoi-border bg-white px-3 py-2 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30"
        />
      </div>
      <div>
        <label className="font-dm text-xs font-medium text-eoi-ink2">{t("account.phone")}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-[10px] border border-eoi-border bg-white px-3 py-2 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-[44px] rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? t("admin.products.saving") : t("common.save")}
      </button>
      {message ? <p className="font-dm text-xs text-eoi-ink2">{message}</p> : null}
    </form>
  );
}
