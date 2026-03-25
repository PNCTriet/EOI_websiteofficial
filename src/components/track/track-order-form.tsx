"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocaleContext, useTranslations } from "@/components/locale-provider";
import { formatDate, formatPrice } from "@/lib/format-locale";
import type { OrderStage } from "@/types/database";

export function TrackOrderForm() {
  const t = useTranslations();
  const { locale } = useLocaleContext();
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sepay_ref: string | null;
    stage: OrderStage;
    total_amount: number;
    created_at: string;
    paid_at: string | null;
    tracking_number: string | null;
    shipping_carrier: string | null;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const r = ref.trim();
    const em = email.trim();
    if (!r || !em) {
      setError(t("store.trackValidation"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc("track_order_by_ref_email", {
        p_ref: r,
        p_email: em,
      });
      if (rpcErr) {
        setError(t("common.error"));
        setLoading(false);
        return;
      }
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setError(t("store.trackNotFound"));
        setLoading(false);
        return;
      }
      setResult(row);
    } catch {
      setError(t("common.error"));
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-eoi-border bg-white p-5 shadow-sm"
      >
        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2" htmlFor="track-ref">
            {t("store.trackRef")}
          </label>
          <input
            id="track-ref"
            type="text"
            autoComplete="off"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="EOI-XXXXXX"
            className="mt-1 w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
        </div>
        <div>
          <label className="font-dm text-xs font-medium text-eoi-ink2" htmlFor="track-email">
            {t("store.trackEmail")}
          </label>
          <input
            id="track-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
        </div>
        {error ? (
          <p className="font-dm text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full rounded-full bg-eoi-ink px-4 py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? t("common.loading") : t("store.trackSubmit")}
        </button>
        <p className="font-dm text-xs text-eoi-ink2">{t("store.trackPrivacy")}</p>
      </form>

      {result ? (
        <div className="rounded-2xl border border-eoi-border bg-white p-5 shadow-sm">
          <p className="font-syne text-lg font-bold text-eoi-ink">
            {result.sepay_ref ?? "—"}
          </p>
          <p className="mt-1 font-dm text-sm text-eoi-ink2">
            {t("store.trackStatus")}:{" "}
            <span className="font-semibold text-eoi-ink">{t(`stages.${result.stage}`)}</span>
          </p>
          <p className="mt-1 font-dm text-sm text-eoi-ink2">
            {t("store.orderTotal")}: {formatPrice(locale, result.total_amount)}
          </p>
          <p className="mt-1 font-dm text-xs text-eoi-ink2">
            {t("store.orderDate")}: {formatDate(locale, result.created_at, true)}
          </p>
          {result.tracking_number || result.shipping_carrier ? (
            <div className="mt-3 rounded-xl border border-eoi-border bg-eoi-surface/50 p-3 font-dm text-sm">
              <p>
                <span className="text-eoi-ink2">{t("store.trackCarrier")}: </span>
                {result.shipping_carrier?.trim() || "—"}
              </p>
              <p className="mt-1">
                <span className="text-eoi-ink2">{t("store.trackTracking")}: </span>
                {result.tracking_number?.trim() || "—"}
              </p>
            </div>
          ) : null}
          <Link
            href="/"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-eoi-border px-4 py-2 font-dm text-sm text-eoi-ink"
          >
            {t("store.continueShopping")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
