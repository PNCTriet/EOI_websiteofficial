"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/components/locale-provider";
import type { OrderStage } from "@/types/database";

const STAGES: OrderStage[] = [
  "pending_payment",
  "paid",
  "processing",
  "printing",
  "shipped",
  "delivered",
  "cancelled",
];

type Props = {
  orderId: string;
  currentStage: OrderStage;
};

export function OrderStageUpdater({ orderId, currentStage }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [stage, setStage] = useState<OrderStage>(currentStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStage(currentStage);
  }, [currentStage]);

  async function apply(next: OrderStage) {
    if (next === stage) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const fromStage = stage;
    const { error: u1 } = await supabase
      .from("orders")
      .update({ stage: next })
      .eq("id", orderId);
    if (u1) {
      setError(u1.message);
      setSaving(false);
      return;
    }
    const { error: u2 } = await supabase.from("order_stage_logs").insert({
      order_id: orderId,
      from_stage: fromStage,
      to_stage: next,
    });
    if (u2) {
      setError(u2.message);
      setSaving(false);
      return;
    }
    setStage(next);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
      <p className="font-dm text-xs font-medium uppercase tracking-wide text-eoi-ink2">
        {t("admin.orders.updateStage")}
      </p>
      <select
        value={stage}
        disabled={saving}
        onChange={(e) => void apply(e.target.value as OrderStage)}
        className="mt-2 w-full min-h-[44px] rounded-[10px] border border-eoi-border bg-white px-3 py-2 font-dm text-sm text-eoi-ink outline-none focus:ring-2 focus:ring-eoi-pink/30"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {t(`stages.${s}`)}
          </option>
        ))}
      </select>
      {saving ? (
        <p className="mt-2 font-dm text-xs text-eoi-ink2">
          {t("admin.orders.savingStage")}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 font-dm text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
