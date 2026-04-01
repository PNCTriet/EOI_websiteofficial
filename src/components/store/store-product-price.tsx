"use client";

import type { Locale } from "@/i18n/config";
import { useTranslations } from "@/components/locale-provider";
import {
  discountPercentOff,
  formatPrice,
  formatProductPrice,
  productHasActiveDiscount,
} from "@/lib/format-locale";

type Props = {
  locale: Locale;
  price: number | null;
  compareAtPrice?: number | null;
  emptyLabel: string;
  /** PDP lớn; card = trang chủ / tìm kiếm */
  variant: "detail" | "card";
};

export function StoreProductPrice({
  locale,
  price,
  compareAtPrice,
  emptyLabel,
  variant,
}: Props) {
  const t = useTranslations();
  const showDiscount = productHasActiveDiscount(price, compareAtPrice ?? null);
  if (!showDiscount || price == null) {
    const cls =
      variant === "detail"
        ? "font-syne text-[28px] font-extrabold tracking-[-0.5px] text-eoi-ink"
        : "font-syne text-[15px] font-extrabold tracking-[-0.5px] text-eoi-ink";
    if (variant === "detail") {
      return (
        <p className={cls}>
          {formatProductPrice(locale, price, emptyLabel)}
        </p>
      );
    }
    return (
      <span className={cls}>
        {formatProductPrice(locale, price, emptyLabel)}
      </span>
    );
  }

  const original = formatPrice(locale, compareAtPrice!);
  const sale = formatProductPrice(locale, price, emptyLabel);
  const pct =
    compareAtPrice != null
      ? discountPercentOff(price, compareAtPrice)
      : null;

  const badge =
    pct != null && pct > 0
      ? t("store.discountBadge", { pct: String(pct) })
      : null;

  if (variant === "detail") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-dm text-[15px] font-medium text-eoi-ink2 line-through decoration-eoi-ink2/60">
            {original}
          </span>
          <span className="font-syne text-[28px] font-extrabold tracking-[-0.5px] text-eoi-ink">
            {sale}
          </span>
          {badge ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-dm text-[11px] font-semibold text-rose-800">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-dm text-[11px] text-eoi-ink2 line-through">
        {original}
      </span>
      <span className="font-syne text-[15px] font-extrabold tracking-[-0.5px] text-eoi-ink">
        {sale}
      </span>
      {badge ? (
        <span className="rounded bg-rose-100 px-1 font-dm text-[10px] font-semibold text-rose-800">
          {badge}
        </span>
      ) : null}
    </span>
  );
}
