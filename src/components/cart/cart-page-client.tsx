"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice } from "@/lib/format-locale";
import { useLocaleContext } from "@/components/locale-provider";

export function CartPageClient() {
  const t = useTranslations();
  const { locale } = useLocaleContext();
  const { items, mounted, subtotal, setLineQuantity, removeLine } = useCart();

  if (!mounted) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5 py-12">
        <p className="font-dm text-sm text-eoi-ink2">{t("common.loading")}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-5 py-12 text-center">
        <ShoppingBag size={22} strokeWidth={1.8} className="text-eoi-ink2" aria-hidden />
        <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink">
          {t("store.cartTitle")}
        </h1>
        <p className="max-w-sm font-dm text-sm text-eoi-ink2">
          {t("store.cartEmptyHint")}
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-eoi-ink px-5 py-3 font-dm text-sm font-semibold text-white"
        >
          {t("store.continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-5 py-6 md:px-6">
      <h1 className="font-syne text-xl font-bold tracking-[-0.5px] text-eoi-ink">
        {t("store.cartTitle")}
      </h1>

      <ul className="space-y-4">
        {items.map((line) => (
          <li
            key={`${line.productId}-${line.colorIndex}`}
            className="flex gap-3 rounded-2xl border border-eoi-border bg-white p-3 shadow-sm"
          >
            <div
              className="relative h-[100px] w-20 flex-shrink-0 overflow-hidden rounded-xl"
              style={{ background: "var(--eoi-pink-light)" }}
            >
              {line.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={line.imageUrl}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-syne text-sm text-eoi-ink/30">
                  3D
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-syne text-sm font-bold text-eoi-ink line-clamp-2">
                {line.name}
              </p>
              <p className="mt-0.5 font-dm text-[11px] text-eoi-ink2">
                {t("store.colors")}:{" "}
                <span
                  className="inline-block h-3 w-3 rounded-full align-middle"
                  style={{ backgroundColor: line.colorHex }}
                  title={line.colorHex}
                />
              </p>
              <p className="mt-1 font-syne text-sm font-extrabold text-eoi-ink">
                {formatPrice(locale, line.price)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-eoi-border">
                  <button
                    type="button"
                    aria-label={t("store.decreaseQty")}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center text-eoi-ink"
                    onClick={() =>
                      setLineQuantity(
                        line.productId,
                        line.colorIndex,
                        line.quantity - 1
                      )
                    }
                  >
                    <Minus size={16} strokeWidth={2} />
                  </button>
                  <span className="min-w-[2rem] text-center font-dm text-sm font-medium">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={t("store.increaseQty")}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center text-eoi-ink"
                    onClick={() =>
                      setLineQuantity(
                        line.productId,
                        line.colorIndex,
                        line.quantity + 1
                      )
                    }
                  >
                    <Plus size={16} strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.productId, line.colorIndex)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 font-dm text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} strokeWidth={2} aria-hidden />
                  {t("store.removeFromCart")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-eoi-border bg-eoi-surface/80 p-4">
        <div className="flex items-center justify-between font-dm text-sm">
          <span className="text-eoi-ink2">{t("store.subtotal")}</span>
          <span className="font-syne text-lg font-extrabold text-eoi-ink">
            {formatPrice(locale, subtotal)}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="mt-4 w-full min-h-[48px] rounded-full bg-eoi-pink/50 py-3 font-dm text-sm font-semibold text-white"
        >
          {t("store.checkout")}
        </button>
        <p className="mt-2 text-center font-dm text-[11px] text-eoi-ink2">
          {t("store.checkoutSoon")}
        </p>
        <Link
          href="/"
          className="mt-3 block text-center font-dm text-sm font-medium text-eoi-ink underline-offset-2 hover:underline"
        >
          {t("store.continueShopping")}
        </Link>
      </div>
    </div>
  );
}
