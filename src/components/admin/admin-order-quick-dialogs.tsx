"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "@/components/locale-provider";
import { formatPrice } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";
import {
  allowedTargetStages,
  nextLinearStage,
  requiresTrackingForTransition,
} from "@/lib/order-stage-transitions";
import type { OrderStage } from "@/types/database";

type PreviewResp = {
  order: {
    id: string;
    sepay_ref: string | null;
    stage: OrderStage;
    total_amount: number;
    note: string | null;
  };
  contact: {
    recipient_name: string;
    email: string;
    phone: string;
    addressText: string;
  };
  items: Array<{ name: string; variant: string; quantity: number; unit_price: number }>;
};

type StageDialogProps = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  stage: OrderStage;
  refLabel: string;
  mounted: boolean;
};

export function OrderStageQuickDialog({
  open,
  onClose,
  orderId,
  stage,
  refLabel,
  mounted,
}: StageDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const [cancelStep, setCancelStep] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [saving, setSaving] = useState(false);
  const [stageErr, setStageErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCancelStep(false);
      setCarrier("");
      setTracking("");
      setStageErr(null);
    }
  }, [open]);

  const next = nextLinearStage(stage);
  const canCancel = allowedTargetStages(stage).includes("cancelled");
  const needShipForm = next != null && requiresTrackingForTransition(next);

  const postStage = useCallback(
    async (to: OrderStage, extra?: { tracking_number?: string; shipping_carrier?: string }) => {
      setSaving(true);
      setStageErr(null);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/stage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, ...extra }),
        });
        const data = (await res.json()) as { error?: string; message?: string };
        if (!res.ok) {
          setStageErr(data.message ?? data.error ?? t("admin.orders.quickStageError"));
          setSaving(false);
          return;
        }
        onClose();
        router.refresh();
      } catch {
        setStageErr(t("admin.orders.quickStageError"));
      } finally {
        setSaving(false);
      }
    },
    [orderId, router, onClose, t],
  );

  const onConfirmNext = useCallback(() => {
    if (!next) return;
    if (requiresTrackingForTransition(next)) {
      if (!carrier.trim() || !tracking.trim()) {
        setStageErr(t("admin.orders.stageError"));
        return;
      }
      void postStage(next, {
        shipping_carrier: carrier.trim(),
        tracking_number: tracking.trim(),
      });
      return;
    }
    void postStage(next);
  }, [next, carrier, tracking, postStage, t]);

  if (!mounted || !open) return null;

  const el = (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[max(1rem,8vh)] backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-eoi-border bg-eoi-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-syne text-lg font-bold text-eoi-ink">{t("admin.orders.quickStageTitle")}</h3>
        <p className="mt-2 font-dm text-sm text-eoi-ink2">
          {t("admin.orders.quickStageCurrent", { stage: t(`stages.${stage}`) })}
        </p>

        {cancelStep ? (
          <div className="mt-4 space-y-3">
            <p className="font-dm text-sm text-red-800">
              {t("admin.orders.quickStageCancelBody", { ref: refLabel })}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void postStage("cancelled")}
                className="min-h-[44px] rounded-full bg-red-600 px-4 py-2 font-dm text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("admin.orders.quickStageConfirm")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setCancelStep(false)}
                className="min-h-[44px] rounded-full border border-eoi-border px-4 py-2 font-dm text-sm"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            {next ? (
              <div className="mt-4 space-y-3">
                <p className="font-dm text-sm font-medium text-eoi-ink">
                  {t("admin.orders.quickStageNextPrompt")}{" "}
                  <span className="text-eoi-pink-dark">
                    {t("admin.orders.quickStageNextTo", { stage: t(`stages.${next}`) })}
                  </span>
                </p>
                {needShipForm ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                    <p className="font-dm text-xs text-amber-950">{t("admin.orders.quickStageShipHint")}</p>
                    <input
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder={t("admin.orders.carrierPlaceholder")}
                      className="mt-2 w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
                    />
                    <input
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder={t("admin.orders.trackingPlaceholder")}
                      className="mt-2 w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
                    />
                  </div>
                ) : null}
                {stageErr ? (
                  <p className="font-dm text-sm text-red-600" role="alert">
                    {stageErr}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onConfirmNext()}
                    className="min-h-[44px] rounded-full bg-eoi-ink px-4 py-2 font-dm text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("admin.orders.quickStageConfirm")}
                  </button>
                  {canCancel ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setCancelStep(true)}
                      className="min-h-[44px] rounded-full border border-red-200 bg-red-50 px-4 py-2 font-dm text-sm font-semibold text-red-800"
                    >
                      {t("admin.orders.quickStageCancelOrder")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onClose}
                    className="min-h-[44px] rounded-full border border-eoi-border px-4 py-2 font-dm text-sm"
                  >
                    {t("admin.orders.quickClose")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-4 font-dm text-sm text-eoi-ink2">{t("admin.orders.quickStageNoNext")}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 min-h-[44px] rounded-full border border-eoi-border px-4 py-2 font-dm text-sm"
                >
                  {t("admin.orders.quickClose")}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(el, document.body);
}

type PreviewDialogProps = {
  open: boolean;
  onClose: () => void;
  orderId: string;
  refLabel: string;
  locale: Locale;
  mounted: boolean;
};

export function OrderPreviewQuickDialog({
  open,
  onClose,
  orderId,
  refLabel,
  locale,
  mounted,
}: PreviewDialogProps) {
  const t = useTranslations();
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    setPreview(null);
    void fetch(`/api/admin/orders/${orderId}/preview`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<PreviewResp>;
      })
      .then(setPreview)
      .catch(() => setErr(t("admin.orders.quickError")))
      .finally(() => setLoading(false));
  }, [open, orderId, t]);

  if (!mounted || !open) return null;

  const el = (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[max(1rem,6vh)] backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-eoi-border bg-eoi-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-syne text-lg font-bold text-eoi-ink">{t("admin.orders.quickPreviewTitle")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 font-dm text-sm text-eoi-ink2 hover:bg-eoi-surface"
          >
            {t("admin.orders.quickClose")}
          </button>
        </div>
        <p className="mt-1 font-mono text-xs text-eoi-ink2">{refLabel}</p>

        {loading ? (
          <p className="mt-6 font-dm text-sm text-eoi-ink2">{t("admin.orders.quickLoading")}</p>
        ) : err ? (
          <p className="mt-6 font-dm text-sm text-red-600">{err}</p>
        ) : preview ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-dm text-xs font-semibold uppercase text-eoi-ink2">
                {t("admin.orders.quickPreviewContact")}
              </p>
              <p className="mt-1 font-dm text-sm text-eoi-ink">{preview.contact.recipient_name || "—"}</p>
              <p className="font-dm text-sm text-eoi-ink2">{preview.contact.email || "—"}</p>
              <p className="font-dm text-sm text-eoi-ink2">{preview.contact.phone || "—"}</p>
              <p className="mt-2 whitespace-pre-wrap font-dm text-sm text-eoi-ink">
                {preview.contact.addressText || "—"}
              </p>
            </div>
            <div>
              <p className="font-dm text-xs font-semibold uppercase text-eoi-ink2">
                {t("admin.orders.quickPreviewItems")}
              </p>
              <ul className="mt-2 space-y-2">
                {preview.items.length === 0 ? (
                  <li className="font-dm text-sm text-eoi-ink2">{t("admin.orders.noLineItems")}</li>
                ) : (
                  preview.items.map((it, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-eoi-border/80 bg-eoi-surface/40 px-3 py-2 font-dm text-sm"
                    >
                      <span className="font-medium text-eoi-ink">{it.name}</span>
                      {it.variant ? <span className="text-eoi-ink2"> · {it.variant}</span> : null}
                      <span className="mt-1 block text-xs text-eoi-ink2">
                        ×{it.quantity} · {formatPrice(locale, it.unit_price)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-3 font-syne text-base font-bold text-eoi-ink">
                {formatPrice(locale, preview.order.total_amount)}
              </p>
            </div>
            {preview.order.note?.trim() ? (
              <div>
                <p className="font-dm text-xs font-semibold uppercase text-eoi-ink2">
                  {t("admin.orders.quickPreviewNote")}
                </p>
                <p className="mt-1 font-dm text-sm text-eoi-ink">{preview.order.note}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(el, document.body);
}
