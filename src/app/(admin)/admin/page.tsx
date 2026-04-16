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

type ProductRank = {
  productId: string;
  productName: string;
  qty: number;
  revenue: number;
};

type Props = {
  searchParams: Promise<{ month?: string }>;
};

const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

function toVnUtcIsoAtLocalMidnight(year: number, monthIndex: number, day: number): string {
  const utcMs = Date.UTC(year, monthIndex, day) - VIETNAM_UTC_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

function toDayKeyInTimeZone(input: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(input));
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  const day = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function parseMonthKey(input?: string): string {
  if (typeof input === "string" && /^\d{4}-\d{2}$/.test(input)) return input;
  return toDayKeyInTimeZone(new Date(), VIETNAM_TIMEZONE).slice(0, 7);
}

function monthRange(monthKey: string): { startIso: string; endIso: string; daysInMonth: number; firstWeekday: number } {
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(`${monthKey}-01T12:00:00+07:00`).getDay();
  return {
    startIso: toVnUtcIsoAtLocalMidnight(year, month - 1, 1),
    endIso: toVnUtcIsoAtLocalMidnight(year, month, 1),
    daysInMonth,
    firstWeekday,
  };
}

function heatBgByRatio(ratio: number): string {
  if (ratio <= 0) return "bg-eoi-surface text-eoi-ink2";
  if (ratio < 0.25) return "bg-emerald-100 text-emerald-900";
  if (ratio < 0.5) return "bg-emerald-200 text-emerald-950";
  if (ratio < 0.75) return "bg-emerald-400 text-white";
  return "bg-emerald-600 text-white";
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { month: monthRaw } = await searchParams;
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const monthKey = parseMonthKey(monthRaw);
  const { startIso: monthStart, endIso: monthEnd, daysInMonth, firstWeekday } = monthRange(monthKey);

  const supabase = await createClient();

  let totalOrders = 0;
  let revenueMonth = 0;
  let pendingPayment = 0;
  let printing = 0;
  const revenueByDay = new Map<string, number>();
  let ranking: ProductRank[] = [];
  let recent: RecentOrder[] = [];
  let profileMap = new Map<string, { full_name: string | null }>();

  try {
    const { count: c1 } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });
    totalOrders = c1 ?? 0;

    // Revenue = đã thu tiền trong tháng (theo paid_at), không chỉ stage "paid"
    // (đơn đã in/giao vẫn có paid_at, không còn stage "paid").
    const { data: paidMonth } = await supabase
      .from("orders")
      .select("total_amount,paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", monthStart)
      .lt("paid_at", monthEnd);
    for (const row of paidMonth ?? []) {
      const amount = Number(row.total_amount ?? 0);
      revenueMonth += amount;
      const key = toDayKeyInTimeZone(String(row.paid_at), VIETNAM_TIMEZONE);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + amount);
    }

    const { data: soldLines } = await supabase
      .from("order_items")
      .select("product_id,quantity,unit_price,products(name),orders!inner(paid_at)")
      .gte("orders.paid_at", monthStart)
      .lt("orders.paid_at", monthEnd);

    const rankMap = new Map<string, ProductRank>();
    for (const row of soldLines ?? []) {
      const pid = row.product_id ?? "unknown";
      const qty = Number(row.quantity ?? 0);
      const rev = Number(row.quantity ?? 0) * Number(row.unit_price ?? 0);
      const pName =
        typeof row.products === "object" &&
        row.products &&
        "name" in row.products &&
        typeof (row.products as { name?: unknown }).name === "string"
          ? ((row.products as { name: string }).name || tr("admin.orders.productFallback"))
          : tr("admin.orders.productFallback");
      const cur = rankMap.get(pid) ?? {
        productId: pid,
        productName: pName,
        qty: 0,
        revenue: 0,
      };
      cur.qty += qty;
      cur.revenue += rev;
      rankMap.set(pid, cur);
    }
    ranking = [...rankMap.values()]
      .sort((a, b) => (b.qty - a.qty) || (b.revenue - a.revenue))
      .slice(0, 12);

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
      label: tr("admin.dashboard.statRevenueMonth", { month: monthKey }),
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

  const dayCells: Array<{ key: string; day: number; revenue: number }> = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const day = String(d).padStart(2, "0");
    const dayKey = `${monthKey}-${day}`;
    dayCells.push({
      key: dayKey,
      day: d,
      revenue: revenueByDay.get(dayKey) ?? 0,
    });
  }
  const maxDayRevenue = Math.max(0, ...dayCells.map((x) => x.revenue));

  return (
    <div className="min-w-0">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
        {tr("admin.dashboard.title")}
      </h1>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-eoi-border bg-eoi-surface p-3 shadow-sm sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-dm text-[11px] font-medium leading-tight text-eoi-ink2 sm:text-xs">
                {label}
              </span>
              <Icon size={20} strokeWidth={1.8} className={`shrink-0 ${color}`} aria-hidden />
            </div>
            <p className="mt-1.5 font-syne text-lg font-extrabold tracking-[-0.5px] text-eoi-ink sm:mt-2 sm:text-2xl">
              {value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-eoi-border bg-eoi-surface p-4 shadow-sm sm:mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-syne text-base font-bold text-eoi-ink sm:text-lg">
              {tr("admin.dashboard.revenueHeatmapTitle")}
            </h2>
            <p className="mt-1 font-dm text-xs text-eoi-ink2">
              {tr("admin.dashboard.revenueHeatmapHint")}
            </p>
          </div>
          <form method="get" action="/admin" className="flex items-end gap-2">
            <label className="font-dm text-xs text-eoi-ink2">
              <span className="mb-1 block font-medium">{tr("admin.dashboard.monthPicker")}</span>
              <input
                type="month"
                name="month"
                defaultValue={monthKey}
                className="rounded-[10px] border border-eoi-border px-3 py-2 font-dm text-sm text-eoi-ink"
              />
            </label>
            <button
              type="submit"
              className="min-h-[40px] rounded-full bg-eoi-ink px-4 py-2 font-dm text-xs font-semibold text-white"
            >
              {tr("admin.dashboard.applyMonth")}
            </button>
          </form>
        </div>

        <div className="mt-4">
          <div className="mb-2 grid grid-cols-7 gap-1.5 font-dm text-[10px] text-eoi-ink2">
            {[
              tr("admin.dashboard.weekdaySun"),
              tr("admin.dashboard.weekdayMon"),
              tr("admin.dashboard.weekdayTue"),
              tr("admin.dashboard.weekdayWed"),
              tr("admin.dashboard.weekdayThu"),
              tr("admin.dashboard.weekdayFri"),
              tr("admin.dashboard.weekdaySat"),
            ].map((w) => (
              <div key={w} className="text-center">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} className="h-14 rounded-lg bg-transparent" />
            ))}
            {dayCells.map((cell) => {
              const ratio = maxDayRevenue > 0 ? cell.revenue / maxDayRevenue : 0;
              return (
                <div
                  key={cell.key}
                  className={`h-14 rounded-lg border border-white/0 p-1.5 text-[10px] shadow-sm ${heatBgByRatio(ratio)}`}
                  title={`${cell.key}: ${formatPrice(locale, cell.revenue)}`}
                >
                  <div className="font-dm font-semibold">{cell.day}</div>
                  <div className="mt-1 line-clamp-2 font-dm text-[10px] leading-tight">
                    {cell.revenue > 0 ? formatPrice(locale, cell.revenue) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 font-dm text-[11px] text-eoi-ink2">
            <span>{tr("admin.dashboard.heatLegendLow")}</span>
            <span className="inline-block h-3 w-6 rounded bg-emerald-100" />
            <span className="inline-block h-3 w-6 rounded bg-emerald-200" />
            <span className="inline-block h-3 w-6 rounded bg-emerald-400" />
            <span className="inline-block h-3 w-6 rounded bg-emerald-600" />
            <span>{tr("admin.dashboard.heatLegendHigh")}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-eoi-border bg-eoi-surface p-4 shadow-sm sm:mt-8">
        <h2 className="font-syne text-base font-bold text-eoi-ink sm:text-lg">
          {tr("admin.dashboard.topProductsTitle")}
        </h2>
        <p className="mt-1 font-dm text-xs text-eoi-ink2">
          {tr("admin.dashboard.topProductsHint", { month: monthKey })}
        </p>
        <div className="mt-3 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[520px] text-left font-dm text-sm">
            <thead>
              <tr className="border-b border-eoi-border bg-eoi-surface/80">
                <th className="px-3 py-2 font-medium text-eoi-ink2">{tr("admin.dashboard.rankCol")}</th>
                <th className="px-3 py-2 font-medium text-eoi-ink2">{tr("admin.dashboard.productCol")}</th>
                <th className="px-3 py-2 font-medium text-eoi-ink2">{tr("admin.dashboard.qtySoldCol")}</th>
                <th className="px-3 py-2 font-medium text-eoi-ink2">{tr("admin.dashboard.productRevenueCol")}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-eoi-ink2">
                    {tr("admin.dashboard.noProductRanking")}
                  </td>
                </tr>
              ) : (
                ranking.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`} className={idx % 2 === 1 ? "bg-eoi-surface/40" : ""}>
                    <td className="px-3 py-2 text-eoi-ink2">#{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-eoi-ink">{item.productName}</td>
                    <td className="px-3 py-2 text-eoi-ink">{item.qty}</td>
                    <td className="px-3 py-2 font-semibold text-eoi-ink">{formatPrice(locale, item.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 sm:mt-8">
        <h2 className="mb-2 font-syne text-base font-bold text-eoi-ink sm:mb-3 sm:text-lg">
          {tr("admin.dashboard.recentOrders")}
        </h2>
        <div className="-mx-0 overflow-x-auto overscroll-x-contain rounded-2xl border border-eoi-border bg-eoi-surface shadow-sm">
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
                      <OrderStageBadge stage={o.stage} withIcon />
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
