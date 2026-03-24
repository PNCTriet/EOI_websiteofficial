"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format-locale";
import { useLocaleContext } from "@/components/locale-provider";

type Props = {
  orderId: string;
  sepayRef: string;
  totalAmount: number;
  expiresAt: string | null;
};

export function CheckoutPendingClient({ orderId, sepayRef, totalAmount, expiresAt }: Props) {
  const { locale } = useLocaleContext();
  const router = useRouter();
  const [stage, setStage] = useState("pending_payment");
  const [showSuccess, setShowSuccess] = useState(false);
  const [now, setNow] = useState(Date.now());
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
      void fetch(`/api/orders/${orderId}/status`)
        .then((r) => r.json())
        .then((d: { stage?: string }) => {
          if (!d.stage) return;
          setStage(d.stage);
          if (d.stage === "paid") {
            setShowSuccess(true);
            window.setTimeout(() => {
              router.push(`/checkout/success/${orderId}`);
            }, 1200);
          }
          if (d.stage === "expired") {
            router.push("/checkout/failed?reason=expired");
          }
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [orderId, router]);

  const msLeft = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  useEffect(() => {
    if (expired && stage === "pending_payment") {
      router.push("/checkout/failed?reason=expired");
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
    if (stage === "pending_payment") return 1;
    if (stage === "paid") return 2;
    if (stage === "processing" || stage === "printing") return 3;
    if (stage === "shipped" || stage === "delivered") return 4;
    return 1;
  })();
  const checkpoints = [
    { key: "payment", label: "Payment" },
    { key: "processing", label: "Processing" },
    { key: "delivery", label: "Delivery" },
    { key: "finish", label: "Finish" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-eoi-border bg-white p-5 shadow-sm">
        <h1 className="text-center font-syne text-xl font-bold text-eoi-ink">Cho thanh toan</h1>
        <p className="mt-2 text-center font-dm text-sm text-eoi-ink2">Ma don: {sepayRef}</p>
        <p className="text-center font-syne text-lg font-extrabold text-eoi-ink">
          {formatPrice(locale, totalAmount)}
        </p>

        <div className="mx-auto mt-4 w-full max-w-[250px] rounded-xl border border-eoi-border p-2">
          <Image src={qrUrl} alt="QR payment" width={220} height={220} className="h-auto w-full" />
        </div>

        <div className="mx-auto mt-4 w-full max-w-md space-y-2 text-center font-dm text-sm text-eoi-ink2">
          <p>
            Ngan hang: <span className="font-semibold text-eoi-ink">VPBank</span>
          </p>
          <p>
            STK: <span className="font-semibold text-eoi-ink">{accountNo}</span>
          </p>
          <p>
            Noi dung CK: <span className="font-semibold text-eoi-ink">{sepayRef}</span>
          </p>
          <p>
            Trang thai: <span className="font-semibold text-eoi-ink">{stage}</span>
          </p>
          <p>
            Thoi gian con lai:{" "}
            <span className={`font-semibold ${expired ? "text-red-600" : "text-eoi-ink"}`}>
              {expired ? "Het han" : `${mm}:${ss}`}
            </span>
          </p>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/account/orders"
            className="inline-flex min-h-[44px] items-center rounded-full border border-eoi-border px-4 py-2 font-dm text-sm text-eoi-ink"
          >
            Xem don hang cua toi
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-eoi-border bg-white p-5 shadow-sm">
        <h2 className="text-center font-syne text-lg font-bold text-eoi-ink">Trang thai don hang</h2>
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
            <h2 className="font-syne text-xl font-bold text-eoi-ink">Thanh toan thanh cong</h2>
            <p className="mt-2 font-dm text-sm text-eoi-ink2">
              He thong da xac nhan giao dich cho don {sepayRef}.
            </p>
            <button
              type="button"
              className="mt-4 min-h-[44px] rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white"
              onClick={() => {
                setShowSuccess(false);
                router.push(`/account/orders/${orderId}`);
              }}
            >
              Xem chi tiet don
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
