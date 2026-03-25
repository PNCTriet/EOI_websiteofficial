"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "@/components/locale-provider";
import { slaHoursForStage } from "@/lib/order-stage-sla";
import type { OrderStage } from "@/types/database";

const FLOW: OrderStage[] = [
  "pending_payment",
  "paid",
  "processing",
  "printing",
  "shipped",
  "delivered",
];

const TERMINAL: OrderStage[] = ["cancelled", "expired"];

type Props = {
  orderId: string;
  currentStage: OrderStage;
  enteredStageAt: string;
};

function formatDuration(
  ms: number,
  t: (path: string, vars?: Record<string, string>) => string
): string {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 72) {
    return t("admin.orders.stageTimeDays", { d: String(Math.floor(h / 24)) });
  }
  if (h > 0) {
    return t("admin.orders.stageTimeHoursMins", { h: String(h), m: String(m) });
  }
  return t("admin.orders.stageTimeMins", { m: String(Math.max(1, m)) });
}

export function OrderStagePipeline({ orderId, currentStage, enteredStageAt }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [stage, setStage] = useState<OrderStage>(currentStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const enteredMs = useMemo(() => new Date(enteredStageAt).getTime(), [enteredStageAt]);
  const elapsedMs = now - enteredMs;
  const slaH = slaHoursForStage(stage);
  const slaMs = slaH != null ? slaH * 3600000 : null;
  const ratio = slaMs != null && slaMs > 0 ? elapsedMs / slaMs : null;

  const barTone =
    ratio == null
      ? "bg-eoi-border"
      : ratio < 0.7
        ? "bg-emerald-500"
        : ratio < 1
          ? "bg-amber-500"
          : "bg-red-500";

  async function apply(next: OrderStage) {
    if (next === stage) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const fromStage = stage;
    const { error: u1 } = await supabase.from("orders").update({ stage: next }).eq("id", orderId);
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

      <div className="mt-3 flex flex-wrap gap-2">
        {FLOW.map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            onClick={() => void apply(s)}
            className={`rounded-full px-3 py-2 font-dm text-xs font-semibold transition-colors min-h-[40px] ${
              stage === s
                ? "bg-eoi-ink text-white"
                : "border border-eoi-border bg-white text-eoi-ink2 hover:border-eoi-ink/30 hover:text-eoi-ink"
            }`}
          >
            {t(`stagesShort.${s}`)}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-eoi-border pt-3">
        {TERMINAL.map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            onClick={() => void apply(s)}
            className={`rounded-full px-3 py-2 font-dm text-xs font-semibold min-h-[40px] ${
              stage === s
                ? "bg-red-600 text-white"
                : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
            }`}
          >
            {t(`stagesShort.${s}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-eoi-surface/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 font-dm text-xs text-eoi-ink2">
          <span>{t("admin.orders.stageTimeInStage")}</span>
          <span className="font-semibold text-eoi-ink">{formatDuration(elapsedMs, t)}</span>
        </div>
        {slaMs != null ? (
          <>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-eoi-border">
              <div
                className={`h-full rounded-full transition-all ${barTone}`}
                style={{ width: `${ratio != null ? Math.min(100, ratio * 100) : 0}%` }}
              />
            </div>
            <p className="mt-1 font-dm text-[11px] text-eoi-ink2">
              {t("admin.orders.stageSlaHint").replace("{h}", String(slaH))}
            </p>
          </>
        ) : (
          <p className="mt-2 font-dm text-[11px] text-eoi-ink2">{t("admin.orders.stageNoSla")}</p>
        )}
      </div>

      {saving ? (
        <p className="mt-2 font-dm text-xs text-eoi-ink2">{t("admin.orders.savingStage")}</p>
      ) : null}
      {error ? (
        <p className="mt-2 font-dm text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
