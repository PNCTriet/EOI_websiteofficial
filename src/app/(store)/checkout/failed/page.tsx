import Link from "next/link";
import { getServerI18n } from "@/lib/server-i18n";
import { t } from "@/i18n/translate";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function CheckoutFailedPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const { messages } = await getServerI18n();

  function reasonText(r: string | undefined): string {
    if (r === "expired") return t(messages, "store.checkoutFailedReasonExpired");
    if (r === "payment_failed")
      return t(messages, "store.checkoutFailedReasonPaymentFailed");
    return t(messages, "store.checkoutFailedReasonGeneric");
  }

  return (
    <div className="px-5 py-8 md:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-eoi-border bg-white p-6 text-center shadow-sm">
        <h1 className="font-syne text-2xl font-bold text-eoi-ink">
          {t(messages, "store.checkoutFailedTitle")}
        </h1>
        <p className="mt-2 font-dm text-sm text-eoi-ink2">{reasonText(reason)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/checkout"
            className="inline-flex min-h-[44px] items-center rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white"
          >
            {t(messages, "store.checkoutFailedTryAgain")}
          </Link>
          <Link
            href="/cart"
            className="inline-flex min-h-[44px] items-center rounded-full border border-eoi-border px-5 py-2 font-dm text-sm text-eoi-ink"
          >
            {t(messages, "store.checkoutFailedBackToCart")}
          </Link>
        </div>
      </div>
    </div>
  );
}
