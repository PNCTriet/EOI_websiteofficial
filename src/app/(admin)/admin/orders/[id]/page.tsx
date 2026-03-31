import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { OrderStageBadge } from "@/components/admin/order-stage-badge";
import { OrderStagePipeline } from "@/components/admin/order-stage-pipeline";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/translate";
import { formatShippingAddrLines, parseShippingAddr } from "@/lib/order-shipping";
import { enteredCurrentStageAt } from "@/lib/order-stage-entered-at";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import { getSiteOriginString } from "@/lib/site-url";
import {
  buildCartVariantLabelMap,
  orderItemDisplayProductName,
  orderItemDisplayVariantLabel,
  type OrderItemWithVariantJoin,
} from "@/lib/order-item-display";
import type {
  CustomerRow,
  Json,
  OrderRow,
  OrderStage,
  OrderStageLogRow,
} from "@/types/database";

type OrderWithRelations = OrderRow & {
  customers: CustomerRow | null;
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) => t(messages, path, vars);

  const supabase = await createClient();

  const { data: orderRaw, error } = await supabase
    .from("orders")
    .select("*, customers (*)")
    .eq("id", id)
    .single();

  if (error || !orderRaw) {
    notFound();
  }

  const order = orderRaw as OrderWithRelations;

  let profile: { full_name: string | null; phone: string | null } | null = null;
  if (order.user_id) {
    const { data } = await supabase
      .from("user_profiles")
      .select("full_name, phone")
      .eq("id", order.user_id)
      .maybeSingle();
    profile = data;
  }

  const addr = parseShippingAddr(order.shipping_addr as Json | null);
  const customerName =
    addr?.recipient_name?.trim() ||
    order.customers?.name?.trim() ||
    profile?.full_name?.trim() ||
    "";
  const emailLine = addr?.email?.trim() || order.customers?.email?.trim() || "";
  const phoneLine = addr?.phone?.trim() || profile?.phone?.trim() || order.customers?.phone?.trim() || "";
  const addressLine =
    formatShippingAddrLines(addr, locale) ||
    order.customers?.address?.trim() ||
    "";

  const { data: itemsRaw } = await supabase
    .from("order_items")
    .select(
      "id,product_id,quantity,unit_price,product_name_snapshot,variant_label_snapshot,variant_image_snapshot,variant_id, products ( name )",
    )
    .eq("order_id", id);

  const items = (itemsRaw as OrderItemWithVariantJoin[] | null) ?? [];

  const variantIds = [
    ...new Set(items.map((i) => i.variant_id).filter(Boolean)),
  ] as string[];
  let variantLabelsById = new Map<string, string>();
  if (variantIds.length > 0) {
    const { data: pvRows } = await supabase
      .from("product_variants")
      .select("id,label")
      .in("id", variantIds);
    variantLabelsById = new Map(
      (pvRows ?? []).map((r) => [r.id, r.label?.trim() ?? ""]),
    );
  }

  const { data: intentRows } = await supabase
    .from("payment_intents")
    .select("cart_snapshot")
    .eq("order_id", id)
    .order("created_at", { ascending: false })
    .limit(1);
  const cartLabels = buildCartVariantLabelMap(intentRows?.[0]?.cart_snapshot);

  const variantLabelOpts = {
    variantLabelsById,
    cartLabels,
  };

  const { data: logsRaw } = await supabase
    .from("order_stage_logs")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const logs = (logsRaw as OrderStageLogRow[] | null) ?? [];
  const enteredStageAt = enteredCurrentStageAt(order.stage, order.created_at, logs);

  const paymentStatus =
    order.stage === "pending_payment"
      ? tr("admin.orders.paymentUnpaid")
      : tr("admin.orders.paymentPaidOrProcessing");

  const ref = order.sepay_ref ?? order.id.slice(0, 8);

  const origin = getSiteOriginString();
  const customerDetailUrl =
    order.hidden_from_account_list && order.link_access_token
      ? `${origin}/account/orders/${order.id}?access=${encodeURIComponent(order.link_access_token)}`
      : null;

  return (
    <div className="min-w-0">
      <Link
        href="/admin/orders"
        className="inline-flex min-h-[44px] items-center gap-1 font-dm text-sm font-medium text-eoi-ink2 hover:text-eoi-ink"
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden />
        {tr("admin.orders.backToList")}
      </Link>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
          {tr("admin.orders.detailTitle", { ref })}
        </h1>
        <OrderStageBadge stage={order.stage} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
          <h2 className="font-syne text-sm font-bold text-eoi-ink">{tr("admin.orders.customer")}</h2>
          <dl className="mt-3 space-y-2 font-dm text-sm text-eoi-ink2">
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.customerName")}</dt>
              <dd className="text-eoi-ink">{customerName || tr("common.dash")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.email")}</dt>
              <dd>{emailLine || tr("common.dash")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.phone")}</dt>
              <dd>{phoneLine || tr("common.dash")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.shippingAddress")}</dt>
              <dd className="whitespace-pre-wrap">{addressLine || tr("common.dash")}</dd>
            </div>
            {order.note ? (
              <div>
                <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.orderNote")}</dt>
                <dd className="text-eoi-ink">{order.note}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <OrderStagePipeline
          orderId={order.id}
          currentStage={order.stage}
          enteredStageAt={enteredStageAt}
        />
      </div>

      {customerDetailUrl ? (
        <div className="mt-4 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 shadow-sm">
          <h2 className="font-syne text-sm font-bold text-amber-950">
            {tr("admin.orders.customerLinksTitle")}
          </h2>
          <p className="mt-1 font-dm text-[11px] text-amber-950/80">{tr("admin.orders.linkHint")}</p>
          <label className="mt-3 block font-dm text-xs font-medium text-amber-950/90">
            {tr("admin.orders.linkAfterPaid")}
          </label>
          <input
            readOnly
            value={customerDetailUrl}
            className="mt-1 w-full rounded-[10px] border border-amber-300/80 bg-white px-3 py-2 font-mono text-[11px] text-amber-950"
          />
        </div>
      ) : null}

      {order.tracking_number || order.shipping_carrier ? (
        <div className="mt-4 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
          <h2 className="font-syne text-sm font-bold text-eoi-ink">{tr("admin.orders.shippingTracking")}</h2>
          <dl className="mt-2 grid gap-2 font-dm text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.shippingCarrier")}</dt>
              <dd className="text-eoi-ink">{order.shipping_carrier?.trim() || tr("common.dash")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">{tr("admin.orders.trackingNumber")}</dt>
              <dd className="text-eoi-ink">{order.tracking_number?.trim() || tr("common.dash")}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <h2 className="font-syne text-sm font-bold text-eoi-ink">{tr("admin.orders.items")}</h2>
        <div className="mt-3 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[480px] text-left font-dm text-sm">
            <thead>
              <tr className="border-b border-eoi-border">
                <th className="py-2 font-medium text-eoi-ink2">{tr("admin.orders.tableName")}</th>
                <th className="py-2 font-medium text-eoi-ink2">{tr("admin.orders.tableVariant")}</th>
                <th className="py-2 font-medium text-eoi-ink2">{tr("admin.orders.qty")}</th>
                <th className="py-2 font-medium text-eoi-ink2">{tr("admin.orders.unitPrice")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-eoi-ink2">
                    {tr("admin.orders.noLineItems")}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b border-eoi-border/60">
                    <td className="py-2 text-eoi-ink">
                      {orderItemDisplayProductName(
                        it,
                        tr("admin.orders.productFallback"),
                      )}
                    </td>
                    <td className="py-2 text-eoi-ink2">
                      {orderItemDisplayVariantLabel(it, variantLabelOpts) ??
                        tr("common.dash")}
                    </td>
                    <td className="py-2">{it.quantity}</td>
                    <td className="py-2">{formatPrice(locale, it.unit_price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-eoi-border pt-4">
          <span className="font-dm text-sm text-eoi-ink2">{tr("admin.orders.orderTotalShort")}</span>
          <span className="font-syne text-xl font-extrabold text-eoi-ink">
            {formatPrice(locale, order.total_amount)}
          </span>
        </div>
        <p className="mt-2 font-dm text-xs text-eoi-ink2">
          {tr("admin.orders.paymentLine", { status: paymentStatus })}
          {order.paid_at ? ` · ${formatDate(locale, order.paid_at, true)}` : ""}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <h2 className="font-syne text-sm font-bold text-eoi-ink">{tr("admin.orders.timeline")}</h2>
        <ul className="relative mt-4 space-y-4 border-l-2 border-eoi-border pl-4">
          {logs.length === 0 ? (
            <li className="font-dm text-sm text-eoi-ink2">{tr("admin.orders.noLogs")}</li>
          ) : (
            logs.map((log) => {
              const from = log.from_stage
                ? t(messages, `stages.${log.from_stage as OrderStage}`)
                : tr("common.dash");
              const toLabel = t(messages, `stages.${log.to_stage}`);
              return (
                <li key={log.id} className="relative font-dm text-sm">
                  <span className="absolute -left-[calc(1rem+5px)] top-1.5 h-2 w-2 rounded-full bg-eoi-pink" />
                  <span className="text-eoi-ink2">{formatDate(locale, log.created_at, true)}</span>
                  <span className="ml-2 text-eoi-ink">
                    {from} → {toLabel}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
