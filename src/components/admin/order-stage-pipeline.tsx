"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/locale-provider";
import {
  allowedTargetStages,
  requiresTrackingForTransition,
} from "@/lib/order-stage-transitions";
import { slaHoursForStage } from "@/lib/order-stage-sla";
import type { OrderStage } from "@/types/database";

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
  const [shipOpen, setShipOpen] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

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

  const targets = useMemo(() => allowedTargetStages(stage), [stage]);

  async function apply(
    next: OrderStage,
    opts?: { tracking_number?: string; shipping_carrier?: string }
  ) {
    if (next === stage) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: next,
          tracking_number: opts?.tracking_number,
          shipping_carrier: opts?.shipping_carrier,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? t("admin.orders.stageError"));
        setSaving(false);
        return;
      }
      setStage(next);
      setShipOpen(false);
      setCarrier("");
      setTracking("");
      setSaving(false);
      router.refresh();
    } catch {
      setError(t("admin.orders.stageError"));
      setSaving(false);
    }
  }

  function onPickTarget(next: OrderStage) {
    if (requiresTrackingForTransition(next)) {
      setShipOpen(true);
      return;
    }
    void apply(next);
  }

  function confirmShip() {
    void apply("shipped", {
      tracking_number: tracking.trim(),
      shipping_carrier: carrier.trim(),
    });
  }

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-3 shadow-sm sm:p-4">
      <p className="font-dm text-xs font-medium uppercase tracking-wide text-eoi-ink2">
        {t("admin.orders.updateStage")}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {targets.map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            onClick={() => onPickTarget(s)}
            className={`rounded-full px-3 py-2 font-dm text-xs font-semibold transition-colors min-h-[40px] ${
              s === "cancelled"
                ? "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                : stage === s
                  ? "bg-eoi-ink text-white"
                  : "border border-eoi-border bg-white text-eoi-ink2 hover:border-eoi-ink/30 hover:text-eoi-ink"
            }`}
          >
            {t(`stagesShort.${s}`)}
          </button>
        ))}
      </div>

      {shipOpen && stage === "printing" ? (
        <div className="mt-3 space-y-2 rounded-xl border border-eoi-border bg-eoi-surface/60 p-3">
          <p className="font-dm text-xs font-medium text-eoi-ink">{t("admin.orders.shipFormTitle")}</p>
          <input
            type="text"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder={t("admin.orders.carrierPlaceholder")}
            className="w-full rounded-[10px] border border-eoi-border bg-white px-3 py-2 font-dm text-sm"
            autoComplete="off"
          />
          <input
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder={t("admin.orders.trackingPlaceholder")}
            className="w-full rounded-[10px] border border-eoi-border bg-white px-3 py-2 font-dm text-sm"
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !carrier.trim() || !tracking.trim()}
              onClick={() => void confirmShip()}
              className="rounded-full bg-eoi-ink px-4 py-2 font-dm text-xs font-semibold text-white disabled:opacity-50 min-h-[40px]"
            >
              {t("admin.orders.confirmShipped")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShipOpen(false);
                setCarrier("");
                setTracking("");
              }}
              className="rounded-full border border-eoi-border px-4 py-2 font-dm text-xs font-semibold min-h-[40px]"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}

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
