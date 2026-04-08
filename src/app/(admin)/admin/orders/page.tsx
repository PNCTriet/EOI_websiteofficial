import Link from "next/link";
import { Download } from "lucide-react";
import { AdminOrdersKanban } from "@/components/admin/admin-orders-kanban";
import { AdminOrdersTableRow } from "@/components/admin/admin-orders-table-row";
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
  searchParams: Promise<{
    stage?: string;
    view?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
};

function buildOrdersQuery(parts: {
  stage?: string;
  view?: string;
  q?: string;
  from?: string;
  to?: string;
}): string {
  const p = new URLSearchParams();
  if (parts.stage && parts.stage !== "all") p.set("stage", parts.stage);
  if (parts.view === "kanban") p.set("view", "kanban");
  if (parts.q?.trim()) p.set("q", parts.q.trim());
  if (parts.from) p.set("from", parts.from);
  if (parts.to) p.set("to", parts.to);
  return p.toString();
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { stage: stageParam, view: viewParam, q: qParam, from: fromParam, to: toParam } =
    await searchParams;
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
    if (fromParam) {
      const d = new Date(fromParam);
      if (!Number.isNaN(d.getTime())) q = q.gte("created_at", d.toISOString());
    }
    if (toParam) {
      const d = new Date(toParam);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        q = q.lte("created_at", d.toISOString());
      }
    }

    const { data } = await q.limit(8000);
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

  if (qParam?.trim()) {
    const term = qParam.trim().toLowerCase();
    orders = orders.filter((o) => {
      const ref = (o.sepay_ref ?? o.id).toLowerCase();
      return ref.includes(term) || displayName(o).toLowerCase().includes(term);
    });
  }

  const isKanban = viewParam === "kanban";
  const listQuery = buildOrdersQuery({
    stage: stageParam,
    view: isKanban ? "kanban" : undefined,
    q: qParam,
    from: fromParam,
    to: toParam,
  });
  const exportHref = `/api/admin/orders/export?${buildOrdersQuery({
    stage: stageParam,
    q: qParam,
    from: fromParam,
    to: toParam,
  })}`;

  const viewQuery = (v: "table" | "kanban") => {
    const qs = buildOrdersQuery({
      stage: stageParam,
      view: v === "kanban" ? "kanban" : undefined,
      q: qParam,
      from: fromParam,
      to: toParam,
    });
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
          {tr("admin.orders.title")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={viewQuery("table")}
            className={`rounded-full px-3 py-2 font-dm text-xs font-semibold min-h-[44px] flex items-center sm:px-4 sm:py-2.5 ${
              !isKanban ? "bg-eoi-ink text-white" : "border border-eoi-border bg-white text-eoi-ink2"
            }`}
          >
            {tr("admin.orders.viewTable")}
          </Link>
          <Link
            href={viewQuery("kanban")}
            className={`rounded-full px-3 py-2 font-dm text-xs font-semibold min-h-[44px] flex items-center sm:px-4 sm:py-2.5 ${
              isKanban ? "bg-eoi-ink text-white" : "border border-eoi-border bg-white text-eoi-ink2"
            }`}
          >
            {tr("admin.orders.viewKanban")}
          </Link>
          <a
            href={exportHref}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-eoi-border bg-white px-3 py-2 font-dm text-xs font-semibold text-eoi-ink sm:px-4"
          >
            <Download size={16} strokeWidth={2} aria-hidden />
            {tr("admin.orders.exportCsv")}
          </a>
        </div>
      </div>

      <form
        method="get"
        action="/admin/orders"
        className="mt-4 flex flex-col gap-3 rounded-2xl border border-eoi-border bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        {isKanban ? <input type="hidden" name="view" value="kanban" /> : null}
        {stageParam && stageParam !== "all" ? <input type="hidden" name="stage" value={stageParam} /> : null}
        <label className="block min-w-[180px] flex-1 font-dm text-xs text-eoi-ink2">
          <span className="mb-1 block font-medium">{tr("admin.orders.searchOrders")}</span>
          <input
            type="search"
            name="q"
            defaultValue={qParam ?? ""}
            placeholder={tr("admin.orders.searchPlaceholder")}
            className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
          />
        </label>
        <label className="block min-w-[140px] font-dm text-xs text-eoi-ink2">
          <span className="mb-1 block font-medium">{tr("admin.orders.dateFrom")}</span>
          <input
            type="date"
            name="from"
            defaultValue={fromParam ?? ""}
            className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
        </label>
        <label className="block min-w-[140px] font-dm text-xs text-eoi-ink2">
          <span className="mb-1 block font-medium">{tr("admin.orders.dateTo")}</span>
          <input
            type="date"
            name="to"
            defaultValue={toParam ?? ""}
            className="w-full rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-[44px] rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white"
        >
          {tr("admin.orders.applyFilters")}
        </button>
      </form>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {TABS.map((tab) => {
          const qs = buildOrdersQuery({
            stage: tab.stage ?? undefined,
            view: isKanban ? "kanban" : undefined,
            q: qParam,
            from: fromParam,
            to: toParam,
          });
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
        <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-2xl border border-eoi-border bg-white shadow-sm sm:mt-6">
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
                  <AdminOrdersTableRow
                    key={o.id}
                    rowIndex={i}
                    locale={locale}
                    order={{
                      id: o.id,
                      sepay_ref: o.sepay_ref,
                      total_amount: o.total_amount,
                      stage: o.stage,
                      created_at: o.created_at,
                      displayName: displayName(o),
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
