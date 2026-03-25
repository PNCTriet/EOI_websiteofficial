import { notFound } from "next/navigation";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/server-i18n";
import { userPhaseProgress } from "@/lib/order-user-phase";
import type { OrderStage } from "@/types/database";

type Props = { params: Promise<{ id: string }> };

export default async function AccountOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const { locale, messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("id,sepay_ref,total_amount,stage,created_at,paid_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  const stage = order.stage as OrderStage;

  const { data: items } = await supabase
    .from("order_items")
    .select("id,product_name_snapshot,quantity,unit_price")
    .eq("order_id", order.id);

  const progress = userPhaseProgress(stage);
  const isClosed = stage === "cancelled" || stage === "expired";

  const checkpoints = [
    { key: "payment", label: t(messages, "store.orderTrackingPayment") },
    { key: "preparing", label: t(messages, "store.orderTrackingPreparing") },
    { key: "shipping", label: t(messages, "store.orderTrackingShipping") },
    { key: "done", label: t(messages, "store.orderTrackingDone") },
  ];

  const barPct = isClosed ? 0 : (progress / 4) * 100;

  function dotState(idx: number) {
    if (isClosed) return { done: false, current: false };
    if (progress === 0) {
      return { done: false, current: idx === 0 };
    }
    const done = idx < progress;
    const current = progress < 4 && idx === progress;
    return { done, current };
  }

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
      <h2 className="font-syne text-lg font-bold text-eoi-ink">
        {t(messages, "store.orderRef", { ref: order.sepay_ref ?? order.id })}
      </h2>
      <p className="mt-1 font-dm text-xs text-eoi-ink2">
        {formatDate(locale, order.created_at, true)}
      </p>
      <p className="mt-2 font-syne text-base font-bold text-eoi-ink">
        {formatPrice(locale, order.total_amount)}
      </p>

      <p className="mt-2 inline-block rounded-full bg-eoi-border/80 px-2.5 py-1 font-dm text-[10px] font-bold uppercase tracking-wide text-eoi-ink">
        {t(messages, `stages.${stage}`)}
      </p>

      {isClosed ? (
        <div
          className={`mt-4 rounded-xl border px-3 py-3 font-dm text-sm ${
            stage === "expired"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {stage === "expired"
            ? t(messages, "store.orderBannerExpired")
            : t(messages, "store.orderBannerCancelled")}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-eoi-border bg-eoi-surface/50 p-4">
          <div className="relative mx-auto max-w-2xl">
            <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-eoi-border" />
            <div
              className="absolute left-0 top-3 h-1 rounded-full bg-eoi-pink transition-all"
              style={{ width: `${barPct}%` }}
            />
            <div className="relative grid grid-cols-4 gap-2">
              {checkpoints.map((cp, idx) => {
                const { done, current } = dotState(idx);
                const highlight = done || current;
                return (
                  <div key={cp.key} className="text-center">
                    <span
                      className={`mx-auto block h-6 w-6 rounded-full border-2 ${
                        done
                          ? "border-emerald-600 bg-emerald-500"
                          : current
                            ? "border-eoi-pink bg-white ring-2 ring-eoi-pink/40"
                            : "border-eoi-border bg-white"
                      }`}
                    />
                    <p className={`mt-2 font-dm text-xs ${highlight ? "text-eoi-ink" : "text-eoi-ink2"}`}>
                      {cp.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {progress === 0 ? (
            <p className="mt-3 text-center font-dm text-xs text-eoi-ink2">
              {t(messages, "store.orderTrackingPendingPayment")}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {(items ?? []).map((it) => (
          <div key={it.id} className="rounded-lg border border-eoi-border px-3 py-2">
            <p className="font-dm text-sm text-eoi-ink">
              {it.product_name_snapshot ?? t(messages, "admin.orders.productFallback")}
            </p>
            <p className="font-dm text-xs text-eoi-ink2">
              x{it.quantity} · {formatPrice(locale, it.unit_price)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
