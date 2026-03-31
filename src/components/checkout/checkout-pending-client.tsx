"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/format-locale";
import { useLocaleContext, useTranslations } from "@/components/locale-provider";

type Props = {
  intentId: string;
  sepayRef: string;
  totalAmount: number;
  expiresAt: string | null;
  /** Đơn custom: giữ ?access= khi chuyển sang success / đơn */
  linkAccessToken?: string | null;
};

export function CheckoutPendingClient({
  intentId,
  sepayRef,
  totalAmount,
  expiresAt,
  linkAccessToken,
}: Props) {
  const { locale } = useLocaleContext();
  const t = useTranslations();
  const { clearCart } = useCart();
  const router = useRouter();
  const [stage, setStage] = useState("pending");
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [flash, setFlash] = useState<"none" | "success" | "danger">("none");
  const [now, setNow] = useState(Date.now());
  const leaveRef = useRef(false);
  const cartClearedRef = useRef(false);
  const expired = useMemo(() => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= now;
  }, [expiresAt, now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch(`/api/payment-intents/${intentId}/status`)
        .then((r) => r.json())
        .then((d: { status?: string; order_id?: string | null }) => {
          if (!d.status) return;
          setStage(d.status);
          if (d.status === "paid" && d.order_id) {
            if (!cartClearedRef.current) {
              cartClearedRef.current = true;
              clearCart();
            }
            setPaidOrderId(d.order_id);
            setFlash("success");
            setShowSuccess(true);
            window.setTimeout(() => {
              const qs =
                linkAccessToken != null && linkAccessToken !== ""
                  ? `?access=${encodeURIComponent(linkAccessToken)}`
                  : "";
              router.push(`/checkout/success/${d.order_id}${qs}`);
            }, 1200);
          }
          if (d.status === "expired") {
            if (leaveRef.current) return;
            leaveRef.current = true;
            setFlash("danger");
            window.setTimeout(() => router.push("/checkout/failed?reason=expired"), 900);
          }
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [intentId, router, clearCart, linkAccessToken]);

  const msLeft = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  useEffect(() => {
    if (expired && stage === "pending") {
      if (leaveRef.current) return;
      leaveRef.current = true;
      setFlash("danger");
      window.setTimeout(() => router.push("/checkout/failed?reason=expired"), 900);
    }
  }, [expired, stage, router]);

  const mm = String(Math.floor(msLeft / 60000)).padStart(2, "0");
  const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0");
  const bankCode = process.env.NEXT_PUBLIC_PAYMENT_BANK_CODE ?? "970432";
  const accountNo = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NO ?? "214244527";
  const accountName = process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME ?? "EOI";
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(
    sepayRef
  )}&accountName=${encodeURIComponent(accountName)}`;
  const progress = (() => {
    if (stage === "pending") return 1;
    if (stage === "paid") return 2;
    if (stage === "processing" || stage === "printing") return 3;
    if (stage === "shipped" || stage === "delivered") return 4;
    return 1;
  })();
  const checkpoints = [
    { key: "payment", label: t("store.checkoutPendingCp1") },
    { key: "processing", label: t("store.checkoutPendingCp2") },
    { key: "delivery", label: t("store.checkoutPendingCp3") },
    { key: "finish", label: t("store.checkoutPendingCp4") },
  ];

  const mainCardClass =
    flash === "success"
      ? "border-emerald-300 bg-emerald-50/90 shadow-[0_0_0_4px_rgba(52,211,153,0.35)] transition-all duration-500"
      : flash === "danger"
        ? "border-red-300 bg-red-50/90 shadow-[0_0_0_4px_rgba(248,113,113,0.35)] transition-all duration-500"
        : "border-eoi-border bg-white";

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 shadow-sm ${mainCardClass}`}>
        <h1 className="text-center font-syne text-xl font-bold text-eoi-ink">
          {t("store.checkoutPendingTitle")}
        </h1>
        <p className="mt-2 text-center font-dm text-sm text-eoi-ink2">
          {t("store.checkoutPendingRef", { ref: sepayRef })}
        </p>
        <p className="text-center font-syne text-lg font-extrabold text-eoi-ink">
          {formatPrice(locale, totalAmount)}
        </p>

        <div className="mx-auto mt-4 w-full max-w-[250px] rounded-xl border border-eoi-border p-2">
          <Image src={qrUrl} alt="QR payment" width={220} height={220} className="h-auto w-full" />
        </div>

        <div className="mx-auto mt-4 w-full max-w-md space-y-2 text-center font-dm text-sm text-eoi-ink2">
          <p>
            {t("store.checkoutPendingBank")}: <span className="font-semibold text-eoi-ink">VPBank</span>
          </p>
          <p>
            {t("store.checkoutPendingAccount")}:{" "}
            <span className="font-semibold text-eoi-ink">{accountNo}</span>
          </p>
          <p>
            {t("store.checkoutPendingTransferContent")}:{" "}
            <span className="font-semibold text-eoi-ink">{sepayRef}</span>
          </p>
          <p>
            {t("store.checkoutPendingStatus")}:{" "}
            <span className="font-semibold text-eoi-ink">
              {t(`stages.${stage === "pending" ? "pending_payment" : stage}`)}
            </span>
          </p>
          <p>
            {t("store.checkoutPendingTimeLeft")}{" "}
            <span className={`font-semibold ${expired ? "text-red-600" : "text-eoi-ink"}`}>
              {expired ? t("store.checkoutPendingExpiredLabel") : `${mm}:${ss}`}
            </span>
          </p>
        </div>

        <div className="mt-5 text-center">
          <Link
            href={
              paidOrderId && linkAccessToken
                ? `/account/orders/${paidOrderId}?access=${encodeURIComponent(linkAccessToken)}`
                : "/account/orders"
            }
            className="inline-flex min-h-[44px] items-center rounded-full border border-eoi-border px-4 py-2 font-dm text-sm text-eoi-ink"
          >
            {t("store.checkoutPendingMyOrders")}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-eoi-border bg-white p-5 shadow-sm">
        <h2 className="text-center font-syne text-lg font-bold text-eoi-ink">
          {t("store.checkoutPendingProgressTitle")}
        </h2>
        <div className="mt-5">
          <div className="relative mx-auto max-w-2xl">
            <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-eoi-border" />
            <div
              className="absolute left-0 top-3 h-1 rounded-full bg-eoi-pink transition-all"
              style={{ width: `${((progress - 1) / (checkpoints.length - 1)) * 100}%` }}
            />
            <div className="relative grid grid-cols-4 gap-2">
              {checkpoints.map((cp, idx) => {
                const done = idx + 1 <= progress;
                return (
                  <div key={cp.key} className="text-center">
                    <span
                      className={`mx-auto block h-6 w-6 rounded-full border-2 ${
                        done ? "border-eoi-pink bg-eoi-pink" : "border-eoi-border bg-white"
                      }`}
                    />
                    <p className={`mt-2 font-dm text-xs ${done ? "text-eoi-ink" : "text-eoi-ink2"}`}>
                      {cp.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showSuccess ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-center shadow-xl">
            <h2 className="font-syne text-xl font-bold text-emerald-900">
              {t("store.checkoutPendingSuccessTitle")}
            </h2>
            <p className="mt-2 font-dm text-sm text-emerald-900/80">
              {t("store.checkoutPendingSuccessBody", { ref: sepayRef })}
            </p>
            <button
              type="button"
              className="mt-4 min-h-[44px] rounded-full bg-emerald-700 px-5 py-2 font-dm text-sm font-semibold text-white"
              onClick={() => {
                setShowSuccess(false);
                if (paidOrderId && linkAccessToken) {
                  router.push(
                    `/account/orders/${paidOrderId}?access=${encodeURIComponent(linkAccessToken)}`,
                  );
                } else {
                  router.push("/account/orders");
                }
              }}
            >
              {t("store.checkoutPendingSuccessCta")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
