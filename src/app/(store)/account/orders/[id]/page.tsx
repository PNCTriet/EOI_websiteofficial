import { notFound } from "next/navigation";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/server-i18n";

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

  const { data: items } = await supabase
    .from("order_items")
    .select("id,product_name_snapshot,quantity,unit_price")
    .eq("order_id", order.id);

  const progress = (() => {
    if (order.stage === "pending_payment") return 1;
    if (order.stage === "paid") return 2;
    if (order.stage === "processing" || order.stage === "printing") return 3;
    if (order.stage === "shipped" || order.stage === "delivered") return 4;
    return 1;
  })();
  const checkpoints = [
    { key: "payment", label: "Payment" },
    { key: "processing", label: "Processing" },
    { key: "delivery", label: "Delivery" },
    { key: "finish", label: "Finish" },
  ];

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

      <div className="mt-4 rounded-xl border border-eoi-border bg-eoi-surface/50 p-4">
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
