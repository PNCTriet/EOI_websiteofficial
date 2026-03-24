"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/components/locale-provider";

type Props = {
  productId: string;
  initialActive: boolean;
};

export function ProductActiveToggle({ productId, initialActive }: Props) {
  const t = useTranslations();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !active;
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: next })
      .eq("id", productId);
    if (!error) {
      setActive(next);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className={`rounded-full px-3 py-1 font-dm text-[11px] font-semibold ${
        active
          ? "bg-green-100 text-green-800"
          : "bg-eoi-border text-eoi-ink2"
      } disabled:opacity-50`}
    >
      {loading ? "…" : active ? t("admin.toggle.onSale") : t("admin.toggle.off")}
    </button>
  );
}
