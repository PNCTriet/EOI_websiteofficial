import { createClient } from "@/lib/supabase/server";
import { orderCustomerDisplayName } from "@/lib/order-customer-display";
import { parseShippingAddr } from "@/lib/order-shipping";
import { t } from "@/i18n/translate";
import { getServerI18n } from "@/lib/server-i18n";
import { AdminCustomersTable, type CustomerRelatedOrder } from "@/components/admin/admin-customers-table";
import type { Json, OrderStage } from "@/types/database";

type CustomerAgg = {
  emailKey: string;
  emailDisplay: string;
  names: string[];
  phoneDisplay: string;
  orderCount: number;
  /** Tổng từ từng dòng order_items (đơn giá snapshot), chỉ đơn hợp lệ. */
  totalSpent: number;
  /** Đơn mới nhất — dùng shipping để hiển thị liên hệ. */
  latestShipping: Json | null;
  lastOrderAt: string;
  relatedOrders: CustomerRelatedOrder[];
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
        "id, sepay_ref, user_id, total_amount, stage, paid_at, payment_method, shipping_addr, created_at",
      )
      .order("created_at", { ascending: false });

    const userIds = [
      ...new Set((orderRows ?? []).map((o) => o.user_id).filter(Boolean)),
    ] as string[];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, phone")
        .in("id", userIds);
      profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, phone: p.phone }])
      );
    }

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

    const byEmail = new Map<
      string,
      CustomerAgg & { namesSet: Set<string> }
    >();

    for (const o of orderRows ?? []) {
      const uid = o.user_id as string | null;
      const created = o.created_at as string;
      const stage = o.stage as OrderStage;
      const pm = String(o.payment_method ?? "bank_transfer");
      const addr = parseShippingAddr(o.shipping_addr as Json | null);
      const emailRaw = addr?.email?.trim() || "";
      const emailKey = emailRaw.toLowerCase() || (uid ? `uid:${uid}` : `order:${o.id}`);
      const emailDisplay = emailRaw || tr("common.dash");
      const profile = uid ? profileMap.get(uid) : undefined;
      const displayName = orderCustomerDisplayName(
        o.shipping_addr as Json | null,
        null,
        profile?.full_name ?? null
      );
      const phoneCandidate = profile?.phone?.trim() || addr?.phone?.trim() || "";

      let a = byEmail.get(emailKey);
      if (!a) {
        a = {
          emailKey,
          emailDisplay,
          names: [],
          phoneDisplay: phoneCandidate || tr("common.dash"),
          orderCount: 0,
          totalSpent: 0,
          latestShipping: o.shipping_addr as Json | null,
          lastOrderAt: created,
          relatedOrders: [],
          namesSet: new Set<string>(),
        };
        byEmail.set(emailKey, a);
      }
      a.orderCount += 1;
      if (displayName && displayName !== tr("common.dash")) {
        a.namesSet.add(displayName);
      }
      if (emailRaw && a.emailDisplay === tr("common.dash")) {
        a.emailDisplay = emailRaw;
      }
      if (phoneCandidate && a.phoneDisplay === tr("common.dash")) {
        a.phoneDisplay = phoneCandidate;
      }
      if (created > a.lastOrderAt) {
        a.lastOrderAt = created;
        a.latestShipping = o.shipping_addr as Json | null;
        if (phoneCandidate) a.phoneDisplay = phoneCandidate;
      }

      if (countsTowardSpent(stage, o.paid_at, pm)) {
        const fromLines = sumByOrder.get(o.id);
        const fallback = Number(o.total_amount ?? 0);
        a.totalSpent += fromLines != null && fromLines > 0 ? fromLines : fallback;
      }
      a.relatedOrders.push({
        id: o.id,
        ref: o.sepay_ref ?? o.id.slice(0, 8),
        createdAt: created,
        stage,
        totalAmount: Number(o.total_amount ?? 0),
      });
    }

    rows = [...byEmail.values()]
      .map((r) => ({
        emailKey: r.emailKey,
        emailDisplay: r.emailDisplay,
        names:
          r.namesSet.size > 0 ? [...r.namesSet] : [tr("common.dash")],
        phoneDisplay: r.phoneDisplay,
        orderCount: r.orderCount,
        totalSpent: r.totalSpent,
        latestShipping: r.latestShipping,
        lastOrderAt: r.lastOrderAt,
        relatedOrders: r.relatedOrders.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
  } catch {
    rows = [];
  }

  return (
    <div className="min-w-0">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink sm:text-2xl">
        {tr("admin.customers.title")}
      </h1>
      <p className="mt-1 font-dm text-sm text-eoi-ink2">{tr("admin.customers.subtitle")}</p>

      <AdminCustomersTable
        locale={locale}
        rows={rows}
        labels={{
          noCustomers: tr("admin.customers.noCustomers"),
          tableName: tr("admin.customers.tableName"),
          tableEmail: tr("admin.customers.tableEmail"),
          tablePhone: tr("admin.customers.tablePhone"),
          tableOrderCount: tr("admin.customers.tableOrderCount"),
          tableTotalSpent: tr("admin.customers.tableTotalSpent"),
          tableLastOrder: tr("admin.customers.tableLastOrder"),
          searchPlaceholder: tr("admin.customers.searchPlaceholder"),
          filterName: tr("admin.customers.filterName"),
          filterEmail: tr("admin.customers.filterEmail"),
          filterPhone: tr("admin.customers.filterPhone"),
          filterMinOrders: tr("admin.customers.filterMinOrders"),
          filterMinSpent: tr("admin.customers.filterMinSpent"),
          clearFilters: tr("admin.customers.clearFilters"),
          popupTitle: tr("admin.customers.popupTitle"),
          popupClose: tr("admin.customers.popupClose"),
          popupRelatedOrders: tr("admin.customers.popupRelatedOrders"),
          popupCustomerInfo: tr("admin.customers.popupCustomerInfo"),
          popupTotalSpent: tr("admin.customers.popupTotalSpent"),
          popupOrderCount: tr("admin.customers.popupOrderCount"),
          popupRefCol: tr("admin.orders.tableRef"),
          popupDateCol: tr("admin.orders.tableDate"),
          popupStageCol: tr("admin.orders.tableStage"),
          popupTotalCol: tr("admin.orders.tableTotal"),
          stageLabels: {
            pending_payment: tr("stagesShort.pending_payment"),
            paid: tr("stagesShort.paid"),
            processing: tr("stagesShort.processing"),
            printing: tr("stagesShort.printing"),
            shipped: tr("stagesShort.shipped"),
            delivered: tr("stagesShort.delivered"),
            cancelled: tr("stagesShort.cancelled"),
            expired: tr("stagesShort.expired"),
          },
        }}
      />
    </div>
  );
}
