import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrderStageBadge } from "@/components/admin/order-stage-badge";
import { OrderStageUpdater } from "@/components/admin/order-stage-updater";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type {
  CustomerRow,
  OrderItemRow,
  OrderRow,
  OrderStage,
  OrderStageLogRow,
  ProductRow,
} from "@/types/database";

type OrderWithCustomer = OrderRow & { customers: CustomerRow | null };
type ItemWithProduct = OrderItemRow & {
  products: Pick<ProductRow, "name"> | null;
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const supabase = await createClient();

  const { data: orderRaw, error } = await supabase
    .from("orders")
    .select("*, customers (*)")
    .eq("id", id)
    .single();

  if (error || !orderRaw) {
    notFound();
  }

  const order = orderRaw as OrderWithCustomer;

  const { data: itemsRaw } = await supabase
    .from("order_items")
    .select("*, products ( name )")
    .eq("order_id", id);

  const items = (itemsRaw as ItemWithProduct[] | null) ?? [];

  const { data: logsRaw } = await supabase
    .from("order_stage_logs")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const logs = (logsRaw as OrderStageLogRow[] | null) ?? [];

  const paymentStatus =
    order.stage === "pending_payment"
      ? tr("admin.orders.paymentUnpaid")
      : tr("admin.orders.paymentPaidOrProcessing");

  const ref = order.sepay_ref ?? order.id.slice(0, 8);

  return (
    <div className="p-5 md:p-6">
      <Link
        href="/admin/orders"
        className="inline-flex min-h-[44px] items-center gap-1 font-dm text-sm font-medium text-eoi-ink2 hover:text-eoi-ink"
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden />
        {tr("admin.orders.backToList")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
          {tr("admin.orders.detailTitle", { ref })}
        </h1>
        <OrderStageBadge stage={order.stage} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
          <h2 className="font-syne text-sm font-bold text-eoi-ink">
            {tr("admin.orders.customer")}
          </h2>
          <dl className="mt-3 space-y-2 font-dm text-sm text-eoi-ink2">
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">
                {tr("admin.orders.customerName")}
              </dt>
              <dd className="text-eoi-ink">
                {order.customers?.name ?? tr("common.dash")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">
                {tr("admin.orders.email")}
              </dt>
              <dd>{order.customers?.email ?? tr("common.dash")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">
                {tr("admin.orders.phone")}
              </dt>
              <dd>{order.customers?.phone ?? tr("common.dash")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-eoi-ink2">
                {tr("admin.orders.shippingAddress")}
              </dt>
              <dd>{order.customers?.address ?? tr("common.dash")}</dd>
            </div>
          </dl>
        </div>

        <OrderStageUpdater orderId={order.id} currentStage={order.stage} />
      </div>

      <div className="mt-6 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <h2 className="font-syne text-sm font-bold text-eoi-ink">
          {tr("admin.orders.items")}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left font-dm text-sm">
            <thead>
              <tr className="border-b border-eoi-border">
                <th className="py-2 font-medium text-eoi-ink2">
                  {tr("admin.orders.tableName")}
                </th>
                <th className="py-2 font-medium text-eoi-ink2">
                  {tr("admin.orders.qty")}
                </th>
                <th className="py-2 font-medium text-eoi-ink2">
                  {tr("admin.orders.unitPrice")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-eoi-ink2">
                    {tr("admin.orders.noLineItems")}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b border-eoi-border/60">
                    <td className="py-2 text-eoi-ink">
                      {it.product_name_snapshot ??
                        it.products?.name ??
                        tr("admin.orders.productFallback")}
                    </td>
                    <td className="py-2">{it.quantity}</td>
                    <td className="py-2">
                      {formatPrice(locale, it.unit_price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-eoi-border pt-4">
          <span className="font-dm text-sm text-eoi-ink2">
            {tr("admin.orders.orderTotalShort")}
          </span>
          <span className="font-syne text-xl font-extrabold text-eoi-ink">
            {formatPrice(locale, order.total_amount)}
          </span>
        </div>
        <p className="mt-2 font-dm text-xs text-eoi-ink2">
          {tr("admin.orders.paymentLine", { status: paymentStatus })}
          {order.paid_at
            ? ` · ${formatDate(locale, order.paid_at, true)}`
            : ""}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
        <h2 className="font-syne text-sm font-bold text-eoi-ink">
          {tr("admin.orders.timeline")}
        </h2>
        <ul className="relative mt-4 space-y-4 border-l-2 border-eoi-border pl-4">
          {logs.length === 0 ? (
            <li className="font-dm text-sm text-eoi-ink2">
              {tr("admin.orders.noLogs")}
            </li>
          ) : (
            logs.map((log) => {
              const from = log.from_stage
                ? t(messages, `stages.${log.from_stage as OrderStage}`)
                : tr("common.dash");
              const toLabel = t(messages, `stages.${log.to_stage}`);
              return (
                <li key={log.id} className="relative font-dm text-sm">
                  <span className="absolute -left-[calc(1rem+5px)] top-1.5 h-2 w-2 rounded-full bg-eoi-pink" />
                  <span className="text-eoi-ink2">
                    {formatDate(locale, log.created_at, true)}
                  </span>
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
