import Link from "next/link";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
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

  const { data } = await supabase
    .from("orders")
    .select("id,sepay_ref,total_amount,stage,created_at")
    .eq("user_id", user.id)
    .eq("hidden_from_account_list", false)
    .order("created_at", { ascending: false });

  const orders = (data ?? []).filter((o) => (o.stage as OrderStage) !== "expired");
  const filtered = orders.filter((o) => tabFilter(tab, o.stage as OrderStage));

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

      {orders.length === 0 ? (
        <p className="mt-4 font-dm text-sm text-eoi-ink2">{t(messages, "store.accountNoOrders")}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 font-dm text-sm text-eoi-ink2">{t(messages, "store.accountNoOrdersInTab")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="block rounded-xl border border-eoi-border p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-dm text-xs text-eoi-ink2">{o.sepay_ref ?? o.id}</p>
                <span className="inline-block rounded-full bg-eoi-border/80 px-2 py-0.5 font-dm text-[10px] font-bold uppercase tracking-wide text-eoi-ink2">
                  {t(messages, `stagesShort.${o.stage}`)}
                </span>
              </div>
              <p className="mt-1 font-dm text-xs text-eoi-ink2">
                {formatDate(locale, o.created_at)}
              </p>
              <p className="mt-1 font-syne text-sm font-bold text-eoi-ink">
                {formatPrice(locale, o.total_amount)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
