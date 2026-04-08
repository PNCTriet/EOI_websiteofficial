import Link from "next/link";
import { t } from "@/i18n/translate";
import type { Messages } from "@/i18n/dictionaries";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
import { claimOrdersMatchingEmail } from "@/lib/claim-orders-by-email";
import { orderStageBadgeClass, orderStageListLinkHoverClass } from "@/lib/order-stage-entered-at";
import { getServerI18n } from "@/lib/server-i18n";
import type { OrderStage } from "@/types/database";

type TabKey = "all" | "active" | "delivered" | "closed";

/** Đơn hết hạn thanh toán không hiển thị cho khách (gọn danh sách). */
function tabFilter(tab: TabKey, stage: OrderStage): boolean {
  switch (tab) {
    case "all":
      return true;
    case "active":
      return (
        stage === "pending_payment" ||
        stage === "paid" ||
        stage === "processing" ||
        stage === "printing" ||
        stage === "shipped"
      );
    case "delivered":
      return stage === "delivered";
    case "closed":
      return stage === "cancelled";
    default:
      return true;
  }
}

function tabFilterIntent(tab: TabKey, status: string): boolean {
  switch (tab) {
    case "all":
      return true;
    case "active":
      return status === "pending";
    case "delivered":
      return false;
    case "closed":
      return status === "expired" || status === "failed";
    default:
      return true;
  }
}

function paymentMethodLabel(messages: Messages, raw: string | null | undefined): string {
  const pm = String(raw ?? "bank_transfer");
  if (pm === "cod") return t(messages, "store.paymentMethodCod");
  if (pm === "pay_later") return t(messages, "store.paymentMethodPayLater");
  if (pm === "bank_transfer") return t(messages, "store.paymentMethodBankTransfer");
  return t(messages, "store.paymentUnknown");
}

type OrderRow = {
  kind: "order";
  id: string;
  sepay_ref: string | null;
  total_amount: number;
  stage: OrderStage;
  created_at: string;
  payment_method: string;
};

type IntentRow = {
  kind: "intent";
  id: string;
  sepay_ref: string | null;
  amount: number;
  status: string;
  created_at: string;
};

type MergedRow = OrderRow | IntentRow;

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AccountOrdersPage({ searchParams }: Props) {
  const { tab: tabRaw } = await searchParams;
  const tab = (["all", "active", "delivered", "closed"].includes(tabRaw ?? "")
    ? tabRaw
    : "all") as TabKey;

  const { locale, messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await claimOrdersMatchingEmail(user.id, user.email ?? undefined);

  const [{ data: orderData }, { data: intentData }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,sepay_ref,total_amount,stage,created_at,payment_method")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_intents")
      .select("id,sepay_ref,amount,status,created_at")
      .eq("user_id", user.id)
      .is("order_id", null)
      .in("status", ["pending", "expired", "failed"]),
  ]);

  const orders = (orderData ?? []).filter((o) => (o.stage as OrderStage) !== "expired");

  const merged: MergedRow[] = [
    ...orders.map(
      (o): OrderRow => ({
        kind: "order",
        id: o.id,
        sepay_ref: o.sepay_ref,
        total_amount: o.total_amount,
        stage: o.stage as OrderStage,
        created_at: o.created_at,
        payment_method: String(o.payment_method ?? "bank_transfer"),
      }),
    ),
    ...(intentData ?? []).map(
      (i): IntentRow => ({
        kind: "intent",
        id: i.id,
        sepay_ref: i.sepay_ref,
        amount: i.amount,
        status: i.status,
        created_at: i.created_at,
      }),
    ),
  ].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filtered = merged.filter((row) => {
    if (row.kind === "order") return tabFilter(tab, row.stage);
    return tabFilterIntent(tab, row.status);
  });

  const tabs: { key: TabKey; labelKey: string }[] = [
    { key: "all", labelKey: "store.orderTabsAll" },
    { key: "active", labelKey: "store.orderTabsActive" },
    { key: "delivered", labelKey: "store.orderTabsDelivered" },
    { key: "closed", labelKey: "store.orderTabsClosed" },
  ];

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
      <h2 className="font-syne text-lg font-bold text-eoi-ink">
        {t(messages, "store.accountOrdersTitle")}
      </h2>
      <p className="mt-1 font-dm text-xs leading-relaxed text-eoi-ink2">
        {t(messages, "store.accountOrdersHint")}
      </p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, labelKey }) => {
          const href = key === "all" ? "/account/orders" : `/account/orders?tab=${key}`;
          const active = tab === key;
          return (
            <Link
              key={key}
              href={href}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 font-dm text-xs font-semibold min-h-[44px] flex items-center ${
                active ? "bg-eoi-ink text-white" : "border border-eoi-border bg-white text-eoi-ink2"
              }`}
            >
              {t(messages, labelKey)}
            </Link>
          );
        })}
      </div>

      {merged.length === 0 ? (
        <p className="mt-4 font-dm text-sm text-eoi-ink2">{t(messages, "store.accountNoOrders")}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 font-dm text-sm text-eoi-ink2">{t(messages, "store.accountNoOrdersInTab")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((row) =>
            row.kind === "intent" ? (
              <Link
                key={`intent-${row.id}`}
                href={`/checkout/pending/${row.id}`}
                className={`block rounded-xl border border-eoi-border bg-white p-3 ${orderStageListLinkHoverClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-dm text-xs text-eoi-ink2">{row.sepay_ref ?? row.id}</p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-dm text-[10px] font-bold uppercase tracking-wide ${
                      row.status === "pending"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-eoi-border/80 text-eoi-ink2"
                    }`}
                  >
                    {row.status === "pending"
                      ? t(messages, "store.accountPendingBankTransfer")
                      : row.status === "expired"
                        ? t(messages, "stagesShort.expired")
                        : t(messages, "store.paymentFailed")}
                  </span>
                </div>
                <p className="mt-1 font-dm text-xs text-eoi-ink2">
                  {formatDate(locale, row.created_at)}
                </p>
                <p className="mt-1 font-syne text-sm font-bold text-eoi-ink">
                  {formatPrice(locale, row.amount)}
                </p>
                {row.status === "pending" ? (
                  <p className="mt-2 font-dm text-xs font-medium text-eoi-pink-dark">
                    {t(messages, "store.accountIntentPayHint")}
                  </p>
                ) : null}
              </Link>
            ) : (
              <Link
                key={`order-${row.id}`}
                href={`/account/orders/${row.id}`}
                className={`block rounded-xl border border-eoi-border bg-white p-3 ${orderStageListLinkHoverClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-dm text-xs text-eoi-ink2">{row.sepay_ref ?? row.id}</p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-dm text-[10px] font-bold uppercase tracking-wide ${orderStageBadgeClass(row.stage)}`}
                  >
                    {t(messages, `stagesShort.${row.stage}`)}
                  </span>
                </div>
                <p className="mt-1 font-dm text-xs text-eoi-ink2">
                  {formatDate(locale, row.created_at)}
                </p>
                <p className="mt-1 font-syne text-sm font-bold text-eoi-ink">
                  {formatPrice(locale, row.total_amount)}
                </p>
                <p className="mt-2 font-dm text-[11px] text-eoi-ink2">
                  <span className="font-medium text-eoi-ink">
                    {t(messages, "store.accountPaymentMethodLabel")}:
                  </span>{" "}
                  {paymentMethodLabel(messages, row.payment_method)}
                </p>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
