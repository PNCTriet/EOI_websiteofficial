import Link from "next/link";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

function reasonText(reason: string | undefined): string {
  if (reason === "expired") return "Order expired before payment was confirmed.";
  if (reason === "payment_failed") return "Payment failed. Please try again.";
  return "Payment was not completed.";
}

export default async function CheckoutFailedPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  return (
    <div className="px-5 py-8 md:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-eoi-border bg-white p-6 text-center shadow-sm">
        <h1 className="font-syne text-2xl font-bold text-eoi-ink">Payment failed</h1>
        <p className="mt-2 font-dm text-sm text-eoi-ink2">{reasonText(reason)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/checkout"
            className="inline-flex min-h-[44px] items-center rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white"
          >
            Try checkout again
          </Link>
          <Link
            href="/cart"
            className="inline-flex min-h-[44px] items-center rounded-full border border-eoi-border px-5 py-2 font-dm text-sm text-eoi-ink"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </div>
  );
}
