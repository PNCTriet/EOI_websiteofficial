import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCartOnCheckoutSuccess } from "@/components/cart/clear-cart-on-checkout-success";
import { formatPrice } from "@/lib/format-locale";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/server-i18n";
import { t } from "@/i18n/translate";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ access?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { access: accessQuery } = await searchParams;
  const { locale, messages } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: order } = await supabase
    .from("orders")
    .select("id,sepay_ref,total_amount,stage,hidden_from_account_list,link_access_token")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) notFound();

  if (
    order.hidden_from_account_list &&
    order.link_access_token &&
    accessQuery !== order.link_access_token
  ) {
    notFound();
  }

  return (
    <div className="px-5 py-8 md:px-6">
      <ClearCartOnCheckoutSuccess />
      <div className="mx-auto max-w-xl rounded-2xl border border-eoi-border bg-white p-6 text-center shadow-sm">
        <h1 className="font-syne text-2xl font-bold text-eoi-ink">
          {t(messages, "store.checkoutSuccessTitle")}
        </h1>
        <p className="mt-2 font-dm text-sm text-eoi-ink2">
          {t(messages, "store.checkoutSuccessBody", {
            ref: order.sepay_ref ?? order.id,
          })}
        </p>
        <p className="mt-2 font-syne text-xl font-extrabold text-eoi-ink">
          {formatPrice(locale, order.total_amount)}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href={
              order.hidden_from_account_list && order.link_access_token
                ? `/account/orders/${order.id}?access=${encodeURIComponent(order.link_access_token)}`
                : `/account/orders/${order.id}`
            }
            className="inline-flex min-h-[44px] items-center rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white"
          >
            {t(messages, "store.checkoutSuccessViewOrderDetail")}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-full border border-eoi-border px-5 py-2 font-dm text-sm text-eoi-ink"
          >
            {t(messages, "store.checkoutSuccessContinueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
