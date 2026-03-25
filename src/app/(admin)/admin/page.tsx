import {
  ShoppingCart,
  TrendingUp,
  Clock,
  Printer,
} from "lucide-react";
import { OrderStageBadge } from "@/components/admin/order-stage-badge";
import { t } from "@/i18n/translate";
import { createClient } from "@/lib/supabase/server";
import { orderCustomerDisplayName } from "@/lib/order-customer-display";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type { Json, OrderStage } from "@/types/database";

type RecentOrder = {
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  user_id: string | null;
  shipping_addr: Json | null;
  customers: { name: string } | null;
};

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfNextMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}

export default async function AdminDashboardPage() {
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const supabase = await createClient();

  let totalOrders = 0;
  let revenueMonth = 0;
  let pendingPayment = 0;
  let printing = 0;
  let recent: RecentOrder[] = [];
  let profileMap = new Map<string, { full_name: string | null }>();

  try {
    const { count: c1 } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });
    totalOrders = c1 ?? 0;

    // Revenue = đã thu tiền trong tháng (theo paid_at), không chỉ stage "paid"
    // (đơn đã in/giao vẫn có paid_at, không còn stage "paid").
    const monthStart = startOfMonthIso();
    const monthEnd = startOfNextMonthIso();
    const { data: paidMonth } = await supabase
      .from("orders")
      .select("total_amount")
      .not("paid_at", "is", null)
      .gte("paid_at", monthStart)
      .lt("paid_at", monthEnd);
    revenueMonth =
      paidMonth?.reduce((s, r) => s + (r.total_amount ?? 0), 0) ?? 0;

    const { count: c2 } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("stage", "pending_payment");
    pendingPayment = c2 ?? 0;

    const { count: c3 } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("stage", ["printing", "processing"]);
    printing = c3 ?? 0;

    const { data: ord } = await supabase
      .from("orders")
      .select(
        "id, sepay_ref, total_amount, stage, created_at, user_id, shipping_addr, customers ( name )"
      )
      .order("created_at", { ascending: false })
      .limit(10);
    recent = (ord as RecentOrder[] | null) ?? [];

    const userIds = [...new Set(recent.map((o) => o.user_id).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name")
        .in("id", userIds);
      profileMap = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name }]));
    }
  } catch {
    /* tables may not exist yet */
  }

  const stats = [
    {
      label: tr("admin.dashboard.statTotalOrders"),
      value: totalOrders,
      icon: ShoppingCart,
      color: "text-eoi-pink",
    },
    {
      label: tr("admin.dashboard.statRevenueMonth"),
      value: formatPrice(locale, revenueMonth),
      icon: TrendingUp,
      color: "text-eoi-blue",
    },
    {
      label: tr("admin.dashboard.statPendingPayment"),
      value: pendingPayment,
      icon: Clock,
      color: "text-eoi-amber",
    },
    {
      label: tr("admin.dashboard.statPrinting"),
      value: printing,
      icon: Printer,
      color: "text-eoi-ink",
    },
  ];

  return (
    <div className="p-5 md:p-6">
      <h1 className="font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
        {tr("admin.dashboard.title")}
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-dm text-xs font-medium text-eoi-ink2">
                {label}
              </span>
              <Icon size={22} strokeWidth={1.8} className={color} aria-hidden />
            </div>
            <p className="mt-2 font-syne text-2xl font-extrabold tracking-[-0.5px] text-eoi-ink">
              {value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-syne text-lg font-bold text-eoi-ink">
          {tr("admin.dashboard.recentOrders")}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-eoi-border bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left font-dm text-sm">
            <thead>
              <tr className="border-b border-eoi-border bg-eoi-surface/80">
                <th className="px-4 py-3 font-medium text-eoi-ink2">
                  {tr("admin.dashboard.tableOrderRef")}
                </th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">
                  {tr("admin.dashboard.tableCustomerFull")}
                </th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">
                  {tr("admin.dashboard.tableTotalMoney")}
                </th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">
                  {tr("admin.dashboard.tableStageCol")}
                </th>
                <th className="px-4 py-3 font-medium text-eoi-ink2">
                  {tr("admin.dashboard.tableCreatedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-eoi-ink2"
                  >
                    {tr("admin.dashboard.noOrdersDash")}
                  </td>
                </tr>
              ) : (
                recent.map((o, i) => (
                  <tr
                    key={o.id}
                    className={i % 2 === 1 ? "bg-eoi-surface/50" : ""}
                  >
                    <td className="px-4 py-3 font-medium text-eoi-ink">
                      {o.sepay_ref ?? o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-eoi-ink2">
                      {orderCustomerDisplayName(
                        o.shipping_addr,
                        o.customers?.name ?? null,
                        o.user_id ? profileMap.get(o.user_id)?.full_name ?? null : null
                      ) || tr("common.dash")}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
