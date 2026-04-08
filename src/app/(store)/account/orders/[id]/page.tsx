import { notFound } from "next/navigation";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { formatShippingAddrLines, parseShippingAddr } from "@/lib/order-shipping";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getServerI18n } from "@/lib/server-i18n";
import {
  orderStageBadgeClass,
  orderStageCardHoverClass,
  orderStageHistorySurfaceClass,
} from "@/lib/order-stage-entered-at";
import { userPhaseProgress } from "@/lib/order-user-phase";
import {
  buildCartVariantLabelMap,
  orderItemDisplayProductName,
  orderItemDisplayVariantLabel,
  type OrderItemWithVariantJoin,
} from "@/lib/order-item-display";
import type { Json, OrderStage } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ access?: string }>;
};

export default async function AccountOrderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { access: accessQuery } = await searchParams;
  const { locale, messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const selectOrder =
    "id,sepay_ref,total_amount,stage,created_at,paid_at,shipping_addr,tracking_number,shipping_carrier,hidden_from_account_list,link_access_token,user_id";

  type OrderDetailRow = {
    id: string;
    sepay_ref: string | null;
    total_amount: number;
    stage: string;
    created_at: string;
    paid_at: string | null;
    shipping_addr: Json | null;
    tracking_number: string | null;
    shipping_carrier: string | null;
    hidden_from_account_list: boolean;
    link_access_token: string | null;
    user_id: string | null;
  };

  let order: OrderDetailRow | null = null;

  if (user) {
    const { data } = await supabase
      .from("orders")
      .select(selectOrder)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    order = data as OrderDetailRow | null;
  }

  if (
    !order &&
    accessQuery &&
    typeof accessQuery === "string" &&
    accessQuery.length > 0
  ) {
    const admin = createServiceClient();
    const { data } = await admin.from("orders").select(selectOrder).eq("id", id).maybeSingle();
    const row = data as OrderDetailRow | null;
    if (
      row &&
      row.hidden_from_account_list &&
      row.link_access_token &&
      row.link_access_token === accessQuery
    ) {
      order = row;
    }
  }

  if (!order) notFound();

  const accessOk =
    !order.hidden_from_account_list ||
    !order.link_access_token ||
    accessQuery === order.link_access_token ||
    (user?.id != null && user.id === order.user_id);

  if (!accessOk) notFound();

  const stage = order.stage as OrderStage;
  if (stage === "expired") notFound();

  const readDb = !user ? createServiceClient() : supabase;

  const { data: itemsRaw } = await readDb
    .from("order_items")
    .select(
      "id,product_id,product_name_snapshot,variant_label_snapshot,variant_id,quantity,unit_price, products ( name )",
    )
    .eq("order_id", order.id);
  const items = (itemsRaw as OrderItemWithVariantJoin[] | null) ?? [];

  const variantIds = [
    ...new Set(items.map((i) => i.variant_id).filter(Boolean)),
  ] as string[];
  let variantLabelsById = new Map<string, string>();
  if (variantIds.length > 0) {
    const { data: pvRows } = await readDb
      .from("product_variants")
      .select("id,label")
      .in("id", variantIds);
    variantLabelsById = new Map(
      (pvRows ?? []).map((r) => [r.id, r.label?.trim() ?? ""]),
    );
  }

  const { data: intentRows } = await readDb
    .from("payment_intents")
    .select("cart_snapshot")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const cartLabels = buildCartVariantLabelMap(intentRows?.[0]?.cart_snapshot);

  const variantLabelOpts = {
    variantLabelsById,
    cartLabels,
  };

  const { data: logsRaw } = await readDb
    .from("order_stage_logs")
    .select("id,from_stage,to_stage,created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  const logs = logsRaw ?? [];

  const progress = userPhaseProgress(stage);
  const isClosed = stage === "cancelled";

  const addr = parseShippingAddr(order.shipping_addr as Json | null);
  const addressText = formatShippingAddrLines(addr, locale);

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

      <p
        className={`mt-2 inline-block rounded-full px-2.5 py-1 font-dm text-[10px] font-bold uppercase tracking-wide ${orderStageBadgeClass(stage)}`}
      >
        {t(messages, `stages.${stage}`)}
      </p>

      {isClosed ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 font-dm text-sm text-red-900">
          {t(messages, "store.orderBannerCancelled")}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-eoi-border bg-eoi-surface/50 p-4">
          <div className="relative mx-auto max-w-2xl">
            <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-eoi-border" />
            <div
              className="absolute left-0 top-3 h-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-500 transition-all"
              style={{ width: `${barPct}%` }}
            />
            <div className="relative grid grid-cols-4 gap-2">
              {checkpoints.map((cp, idx) => {
                const { done, current } = dotState(idx);
                const highlight = done || current;
                /* Thanh toán → amber | Chuẩn bị (xử lý) → vàng | Giao → xanh lá */
                const doneTone = [
                  "border-amber-600 bg-amber-500 shadow-sm",
                  "border-yellow-600 bg-yellow-400 shadow-sm",
                  "border-emerald-600 bg-emerald-500 shadow-sm",
                  "border-emerald-700 bg-emerald-600 shadow-sm",
                ][idx]!;
                const currentTone = [
                  "border-amber-500 bg-white ring-2 ring-amber-400/70",
                  "border-yellow-500 bg-white ring-2 ring-yellow-400/80",
                  "border-emerald-500 bg-white ring-2 ring-emerald-400/70",
                  "border-emerald-600 bg-white ring-2 ring-emerald-500/70",
                ][idx]!;
                return (
                  <div key={cp.key} className="text-center">
                    <span
                      className={`mx-auto block h-6 w-6 rounded-full border-2 transition-transform duration-200 ${
                        done ? doneTone : current ? currentTone : "border-eoi-border bg-white"
                      }`}
                    />
                    <p className={`mt-2 font-dm text-xs ${highlight ? "text-eoi-ink font-medium" : "text-eoi-ink2"}`}>
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

      {addressText ? (
        <div className="mt-4 rounded-xl border border-eoi-border bg-white px-3 py-3">
          <p className="font-dm text-xs font-semibold uppercase text-eoi-ink2">
            {t(messages, "store.orderShippingAddress")}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-dm text-sm text-eoi-ink">{addressText}</p>
          {addr?.recipient_name ? (
            <p className="mt-2 font-dm text-xs text-eoi-ink2">
              {addr.recipient_name}
              {addr.phone ? ` · ${addr.phone}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {order.tracking_number || order.shipping_carrier ? (
        <div className="mt-4 rounded-xl border border-eoi-border bg-eoi-surface/50 px-3 py-3 font-dm text-sm">
          <p>
            <span className="text-eoi-ink2">{t(messages, "store.trackCarrier")}: </span>
            <span className="text-eoi-ink">{order.shipping_carrier?.trim() || "—"}</span>
          </p>
          <p className="mt-1">
            <span className="text-eoi-ink2">{t(messages, "store.trackTracking")}: </span>
            <span className="text-eoi-ink">{order.tracking_number?.trim() || "—"}</span>
          </p>
        </div>
      ) : null}

      {logs.length > 0 ? (
        <div className="mt-4 rounded-xl border border-eoi-border bg-white px-3 py-3">
          <p className="font-dm text-xs font-semibold uppercase text-eoi-ink2">
            {t(messages, "store.orderStatusHistory")}
          </p>
          <ul className="mt-2 space-y-2 font-dm text-sm text-eoi-ink">
            {logs.map((log) => {
              const toSt = log.to_stage as OrderStage;
              const fromLabel = log.from_stage
                ? t(messages, `stages.${log.from_stage as OrderStage}`)
                : "—";
              const toLabel = t(messages, `stages.${toSt}`);
              return (
                <li
                  key={log.id}
                  className={`flex flex-wrap gap-x-2 rounded-r-lg px-3 py-2.5 pl-3 last:mb-0 ${orderStageHistorySurfaceClass(toSt)} ${orderStageCardHoverClass}`}
                >
                  <span className="text-eoi-ink2">{formatDate(locale, log.created_at, true)}</span>
                  <span className="text-eoi-ink">
                    {fromLabel} → {toLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {items.map((it) => {
          const variantLabel = orderItemDisplayVariantLabel(it, variantLabelOpts);
          return (
          <div
            key={it.id}
            className={`rounded-lg border border-eoi-border bg-white px-3 py-2 ${orderStageCardHoverClass}`}
          >
            <p className="font-dm text-sm text-eoi-ink">
              {orderItemDisplayProductName(it, t(messages, "admin.orders.productFallback"))}
            </p>
            {variantLabel ? (
              <p className="mt-0.5 font-dm text-xs text-eoi-ink2">
                {t(messages, "store.variantLine")}: {variantLabel}
              </p>
            ) : null}
            <p className="font-dm text-xs text-eoi-ink2">
              x{it.quantity} · {formatPrice(locale, it.unit_price)}
            </p>
          </div>
          );
        })}
      </div>
    </div>
  );
}
