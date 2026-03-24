import Link from "next/link";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrderStageBadge } from "@/components/admin/order-stage-badge";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type { OrderStage } from "@/types/database";

type OrderRow = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  customers: { name: string } | null;
};

const TABS: {
  labelKey:
    | "admin.orders.tabs.all"
    | "admin.orders.tabs.pendingPayment"
    | "admin.orders.tabs.paid"
    | "admin.orders.tabs.printing"
    | "admin.orders.tabs.delivered";
  stage: OrderStage | null;
}[] = [
  { labelKey: "admin.orders.tabs.all", stage: null },
  { labelKey: "admin.orders.tabs.pendingPayment", stage: "pending_payment" },
  { labelKey: "admin.orders.tabs.paid", stage: "paid" },
  { labelKey: "admin.orders.tabs.printing", stage: "printing" },
  { labelKey: "admin.orders.tabs.delivered", stage: "delivered" },
];

type Props = {
  searchParams: Promise<{ stage?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { stage: stageParam } = await searchParams;
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const supabase = await createClient();
  let orders: OrderRow[] = [];
  try {
    let q = supabase
      .from("orders")
      .select("id, sepay_ref, total_amount, stage, created_at, customers ( name )")
      .order("created_at", { ascending: false });
    if (stageParam && stageParam !== "all") {
      q = q.eq("stage", stageParam as OrderStage);
    }
    const { data } = await q;
    orders = (data as OrderRow[] | null) ?? [];
  } catch {
    orders = [];
  }

  return (
    <div className="p-5 md:p-6">
      <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
        {tr("admin.orders.title")}
      </h1>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const href =
            tab.stage === null ? "/admin/orders" : `/admin/orders?stage=${tab.stage}`;
          const active =
            tab.stage === null
              ? !stageParam || stageParam === "all"
              : stageParam === tab.stage;
          return (
            <Link
              key={tab.labelKey}
              href={href}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 font-dm text-xs font-semibold min-h-[44px] flex items-center ${
                active
                  ? "bg-eoi-ink text-white"
                  : "border border-eoi-border bg-white text-eoi-ink2"
              }`}
            >
              {tr(tab.labelKey)}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-eoi-border bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left font-dm text-sm">
          <thead>
            <tr className="border-b border-eoi-border bg-eoi-surface/80">
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.orders.tableRef")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.orders.tableCustomer")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.orders.tableTotal")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.orders.tableStage")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">
                {tr("admin.orders.tableDate")}
              </th>
              <th className="px-4 py-3 font-medium text-eoi-ink2" />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-eoi-ink2">
                  {tr("admin.orders.noOrdersFiltered")}
                </td>
              </tr>
            ) : (
              orders.map((o, i) => (
                <tr
                  key={o.id}
                  className={i % 2 === 1 ? "bg-eoi-surface/50" : ""}
                >
                  <td className="px-4 py-3 font-medium text-eoi-ink">
                    {o.sepay_ref ?? o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-eoi-ink2">
                    {o.customers?.name ?? tr("common.dash")}
                  </td>
                  <td className="px-4 py-3 font-medium text-eoi-ink">
                    {formatPrice(locale, o.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStageBadge stage={o.stage} />
                  </td>
                  <td className="px-4 py-3 text-eoi-ink2">
                    {formatDate(locale, o.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-eoi-ink hover:bg-eoi-surface"
                      aria-label={tr("admin.orders.viewAria")}
                    >
                      <Eye size={18} strokeWidth={2} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
