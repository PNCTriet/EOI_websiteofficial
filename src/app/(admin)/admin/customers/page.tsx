import { createClient } from "@/lib/supabase/server";
import { orderCustomerDisplayName } from "@/lib/order-customer-display";
import { parseShippingAddr } from "@/lib/order-shipping";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { getServerI18n } from "@/lib/server-i18n";
import type { Json, OrderStage } from "@/types/database";

type CustomerAgg = {
  userId: string;
  orderCount: number;
  /** Tổng từ từng dòng order_items (đơn giá snapshot), chỉ đơn hợp lệ. */
  totalSpent: number;
  /** Đơn mới nhất — dùng shipping để hiển thị liên hệ. */
  latestShipping: Json | null;
  lastOrderAt: string;
};

function countsTowardSpent(stage: OrderStage, paidAt: string | null, paymentMethod: string): boolean {
  if (stage === "cancelled" || stage === "expired") return false;
  if (paidAt) return true;
  return paymentMethod === "cod" || paymentMethod === "pay_later";
}

export default async function AdminCustomersPage() {
  const { locale, messages } = await getServerI18n();
  const tr = (path: string, vars?: Record<string, string>) => t(messages, path, vars);

  const supabase = await createClient();
  let rows: CustomerAgg[] = [];
  let profileMap = new Map<
    string,
    { full_name: string | null; phone: string | null }
  >();

  try {
    const { data: orderRows } = await supabase
      .from("orders")
      .select(
        "id, user_id, total_amount, stage, paid_at, payment_method, shipping_addr, created_at",
      )
      .not("user_id", "is", null)
      .order("created_at", { ascending: false });

    const qualifyingIds =
      orderRows
        ?.filter((o) =>
          countsTowardSpent(
            o.stage as OrderStage,
            o.paid_at,
            String(o.payment_method ?? "bank_transfer"),
          ),
        )
        .map((o) => o.id) ?? [];

    const sumByOrder = new Map<string, number>();
    if (qualifyingIds.length > 0) {
      const { data: itemLines } = await supabase
        .from("order_items")
        .select("order_id, quantity, unit_price")
        .in("order_id", qualifyingIds);
      for (const l of itemLines ?? []) {
        const add = Number(l.quantity) * Number(l.unit_price);
        sumByOrder.set(l.order_id, (sumByOrder.get(l.order_id) ?? 0) + add);
      }
    }

    const byUser = new Map<string, CustomerAgg>();

    for (const o of orderRows ?? []) {
      const uid = o.user_id as string;
      const created = o.created_at as string;
      const stage = o.stage as OrderStage;
      const pm = String(o.payment_method ?? "bank_transfer");

      let a = byUser.get(uid);
      if (!a) {
        a = {
          userId: uid,
          orderCount: 0,
          totalSpent: 0,
          latestShipping: o.shipping_addr as Json | null,
          lastOrderAt: created,
        };
        byUser.set(uid, a);
      }
      a.orderCount += 1;
      if (created > a.lastOrderAt) {
        a.lastOrderAt = created;
        a.latestShipping = o.shipping_addr as Json | null;
      }

      if (countsTowardSpent(stage, o.paid_at, pm)) {
        const fromLines = sumByOrder.get(o.id);
        const fallback = Number(o.total_amount ?? 0);
        a.totalSpent += fromLines != null && fromLines > 0 ? fromLines : fallback;
      }
    }

    rows = [...byUser.values()].sort(
      (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime()
    );

    const userIds = rows.map((r) => r.userId);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, phone: p.phone }])
      );
    }
  } catch {
    rows = [];
  }

  return (
    <div className="min-w-0">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
        {tr("admin.customers.title")}
      </h1>
      <p className="mt-1 font-dm text-sm text-eoi-ink2">{tr("admin.customers.subtitle")}</p>

      <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-2xl border border-eoi-border bg-white shadow-sm sm:mt-6">
        <table className="w-full min-w-[800px] text-left font-dm text-sm">
          <thead>
            <tr className="border-b border-eoi-border bg-eoi-surface/80">
              <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.customers.tableName")}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.customers.tableEmail")}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.customers.tablePhone")}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.customers.tableOrderCount")}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.customers.tableTotalSpent")}</th>
              <th className="px-4 py-3 font-medium text-eoi-ink2">{tr("admin.customers.tableLastOrder")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-eoi-ink2">
                  {tr("admin.customers.noCustomers")}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const prof = profileMap.get(row.userId);
                const addr = parseShippingAddr(row.latestShipping);
                const name =
                  orderCustomerDisplayName(row.latestShipping, null, prof?.full_name ?? null) ||
                  tr("common.dash");
                const email = addr?.email?.trim() || tr("common.dash");
                const phone = prof?.phone?.trim() || addr?.phone?.trim() || tr("common.dash");
                return (
                  <tr key={row.userId} className={i % 2 === 1 ? "bg-eoi-surface/50" : ""}>
                    <td className="px-4 py-3 font-medium text-eoi-ink">{name}</td>
                    <td className="px-4 py-3 text-eoi-ink2">{email}</td>
                    <td className="px-4 py-3 text-eoi-ink2">{phone}</td>
                    <td className="px-4 py-3 text-eoi-ink">{row.orderCount}</td>
                    <td className="px-4 py-3 text-eoi-ink">{formatPrice(locale, row.totalSpent)}</td>
                    <td className="px-4 py-3 text-eoi-ink2">{formatDate(locale, row.lastOrderAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
