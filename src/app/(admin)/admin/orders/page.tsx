import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminOrdersKanban } from "@/components/admin/admin-orders-kanban";
import { OrderStageBadge } from "@/components/admin/order-stage-badge";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/translate";
import { orderCustomerDisplayName } from "@/lib/order-customer-display";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type { Json } from "@/types/database";
import type { OrderStage } from "@/types/database";

type OrderRow = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  user_id: string | null;
  shipping_addr: Json | null;
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
  searchParams: Promise<{ stage?: string; view?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { stage: stageParam, view: viewParam } = await searchParams;
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) => t(messages, path, vars);

  const supabase = await createClient();
  let orders: OrderRow[] = [];
  try {
    let q = supabase
      .from("orders")
      .select(
        "id, sepay_ref, total_amount, stage, created_at, user_id, shipping_addr, customers ( name )"
      )
      .order("created_at", { ascending: false });
    if (stageParam && stageParam !== "all") {
      q = q.eq("stage", stageParam as OrderStage);
    }
    const { data } = await q;
    orders = (data as OrderRow[] | null) ?? [];
  } catch {
    orders = [];
  }

  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))] as string[];
  let profileMap = new Map<string, { full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", userIds);
    profileMap = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name }]));
  }

  function displayName(o: OrderRow): string {
    const name = orderCustomerDisplayName(
      o.shipping_addr,
      o.customers?.name ?? null,
      o.user_id ? profileMap.get(o.user_id)?.full_name ?? null : null
    );
    return name || tr("common.dash");
  }

  const isKanban = viewParam === "kanban";
  const viewQuery = (v: "table" | "kanban") => {
    const p = new URLSearchParams();
    if (stageParam && stageParam !== "all") p.set("stage", stageParam);
    if (v === "kanban") p.set("view", "kanban");
    const qs = p.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div className="p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
          {tr("admin.orders.title")}
        </h1>
        <div className="flex gap-2">
          <Link
            href={viewQuery("table")}
            className={`rounded-full px-4 py-2.5 font-dm text-xs font-semibold min-h-[44px] flex items-center ${
              !isKanban ? "bg-eoi-ink text-white" : "border border-eoi-border bg-white text-eoi-ink2"
            }`}
          >
            {tr("admin.orders.viewTable")}
          </Link>
          <Link
            href={viewQuery("kanban")}
            className={`rounded-full px-4 py-2.5 font-dm text-xs font-semibold min-h-[44px] flex items-center ${
              isKanban ? "bg-eoi-ink text-white" : "border border-eoi-border bg-white text-eoi-ink2"
            }`}
          >
            {tr("admin.orders.viewKanban")}
          </Link>
        </div>
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const p = new URLSearchParams();
          if (tab.stage) p.set("stage", tab.stage);
          if (isKanban) p.set("view", "kanban");
          const qs = p.toString();
          const href = qs ? `/admin/orders?${qs}` : isKanban ? "/admin/orders?view=kanban" : "/admin/orders";
          const active =
            tab.stage === null
              ? !stageParam || stageParam === "all"
              : stageParam === tab.stage;
          return (
            <Link
              key={tab.labelKey}
              href={href}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 font-dm text-xs font-semibold min-h-[44px] flex items-center ${
                active ? "bg-eoi-ink text-white" : "border border-eoi-border bg-white text-eoi-ink2"
              }`}
            >
              {tr(tab.labelKey)}
            </Link>
          );
        })}
      </div>

      {isKanban ? (
        <AdminOrdersKanban
          orders={orders.map((o) => ({
            id: o.id,
            sepay_ref: o.sepay_ref,
            total_amount: o.total_amount,
            stage: o.stage,
            created_at: o.created_at,
            displayName: displayName(o),
          }))}
          locale={locale}
          messages={messages}
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-eoi-border bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left font-dm text-sm">
            <thead>
              <tr className="border-b border-eoi-border bg-eoi-surface/80">
                <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.orders.tableRef")}</th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.orders.tableCustomer")}</th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.orders.tableTotal")}</th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.orders.tableStage")}</th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.orders.tableDate")}</th>
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
                  <tr key={o.id} className={i % 2 === 1 ? "bg-eoi-surface/50" : ""}>
                    <td className="px-4 py-3 font-medium text-eoi-ink">
                      {o.sepay_ref ?? o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-eoi-ink2">{displayName(o)}</td>
                    <td className="px-4 py-3 font-medium text-eoi-ink">
                      {formatPrice(locale, o.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStageBadge stage={o.stage} />
                    </td>
                    <td className="px-4 py-3 text-eoi-ink2">{formatDate(locale, o.created_at)}</td>
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
      )}
    </div>
  );
}
