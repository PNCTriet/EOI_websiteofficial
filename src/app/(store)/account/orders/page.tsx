import Link from "next/link";
import { t } from "@/i18n/translate";
import { formatDate, formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/server-i18n";

export default async function AccountOrdersPage() {
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
    .order("created_at", { ascending: false });

  const orders = data ?? [];

  return (
    <div className="rounded-2xl border border-eoi-border bg-white p-4 shadow-sm">
      <h2 className="font-syne text-lg font-bold text-eoi-ink">
        {t(messages, "store.accountOrdersTitle")}
      </h2>
      {orders.length === 0 ? (
        <p className="mt-2 font-dm text-sm text-eoi-ink2">{t(messages, "store.accountNoOrders")}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="block rounded-xl border border-eoi-border p-3"
            >
              <p className="font-dm text-xs text-eoi-ink2">
                {o.sepay_ref ?? o.id}
              </p>
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
