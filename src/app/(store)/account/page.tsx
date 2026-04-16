import { t } from "@/i18n/translate";
import { formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
import { claimOrdersMatchingEmail } from "@/lib/claim-orders-by-email";
import { getServerI18n } from "@/lib/server-i18n";
import type { OrderStage } from "@/types/database";
import { AccountProfileForm } from "@/components/account/profile-form";

export default async function AccountPage() {
  const { locale, messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await claimOrdersMatchingEmail(user.id, user.email ?? undefined);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, phone, default_address")
    .eq("id", user.id)
    .maybeSingle();

  // Chỉ tính theo đúng user_id của tài khoản đang đăng nhập.
  const { data: userOrders } = await supabase
    .from("orders")
    .select("id,total_amount,stage,payment_method,paid_at")
    .eq("user_id", user.id);

  function countsTowardSpent(stage: OrderStage, paidAt: string | null, paymentMethod: string): boolean {
    if (stage === "cancelled" || stage === "expired") return false;
    if (paidAt) return true;
    return paymentMethod === "cod" || paymentMethod === "pay_later";
  }

  const orders = (userOrders ?? []).map((o) => ({
    id: o.id,
    total: Number(o.total_amount ?? 0),
    stage: o.stage as OrderStage,
    paidAt: o.paid_at,
    paymentMethod: String(o.payment_method ?? "bank_transfer"),
  }));

  const countedOrderIds = orders
    .filter((o) => countsTowardSpent(o.stage, o.paidAt, o.paymentMethod))
    .map((o) => o.id);
  const countedOrderIdSet = new Set(countedOrderIds);

  let sumByOrder = new Map<string, number>();
  if (countedOrderIds.length > 0) {
    const { data: lines } = await supabase
      .from("order_items")
      .select("order_id,quantity,unit_price")
      .in("order_id", countedOrderIds);
    for (const line of lines ?? []) {
      const add = Number(line.quantity ?? 0) * Number(line.unit_price ?? 0);
      sumByOrder.set(line.order_id, (sumByOrder.get(line.order_id) ?? 0) + add);
    }
  }

  const totalSpent = orders
    .filter((o) => countedOrderIdSet.has(o.id))
    .reduce((sum, o) => sum + (sumByOrder.get(o.id) ?? o.total), 0);

  const addr = (profile?.default_address ?? {}) as Record<string, string | undefined>;

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink">
        {t(messages, "store.accountTitle")}
      </h1>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-eoi-border bg-eoi-surface/60 px-3 py-2">
          <p className="font-dm text-[11px] uppercase tracking-wide text-eoi-ink2">
            {t(messages, "account.orderCount")}
          </p>
          <p className="mt-1 font-syne text-lg font-bold text-eoi-ink">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-eoi-border bg-eoi-surface/60 px-3 py-2">
          <p className="font-dm text-[11px] uppercase tracking-wide text-eoi-ink2">
            {t(messages, "account.totalSpent")}
          </p>
          <p className="mt-1 font-syne text-lg font-bold text-eoi-ink">
            {formatPrice(locale, totalSpent)}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2 font-dm text-sm text-eoi-ink2">
        <p>
          <span className="font-medium text-eoi-ink">Email:</span> {user.email ?? t(messages, "common.dash")}
        </p>
        <p>
          <span className="font-medium text-eoi-ink">Name:</span>{" "}
          {profile?.full_name ?? t(messages, "common.dash")}
        </p>
        <p>
          <span className="font-medium text-eoi-ink">Phone:</span>{" "}
          {profile?.phone ?? t(messages, "common.dash")}
        </p>
        <p>
          <span className="font-medium text-eoi-ink">Default address:</span>{" "}
          {[
            addr.street,
            addr.ward,
            addr.district,
            addr.province,
          ]
            .filter(Boolean)
            .join(", ") || t(messages, "common.dash")}
        </p>
      </div>
      <AccountProfileForm
        userId={user.id}
        initialFullName={profile?.full_name ?? ""}
        initialPhone={profile?.phone ?? ""}
      />
    </div>
  );
}
