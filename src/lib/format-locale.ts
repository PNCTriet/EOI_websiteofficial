import type { Locale } from "@/i18n/config";

export function formatPrice(locale: Locale, amount: number): string {
  const tag = locale === "vi" ? "vi-VN" : "en-US";
  return `${amount.toLocaleString(tag)}đ`;
}

/** Giá sản phẩm có thể null (sắp ra mắt). */
export function formatProductPrice(
  locale: Locale,
  amount: number | null | undefined,
  emptyLabel: string
): string {
  if (amount == null || Number.isNaN(amount)) return emptyLabel;
  return formatPrice(locale, amount);
}

export function formatDate(
  locale: Locale,
  iso: string,
  withTime?: boolean
): string {
  const tag = locale === "vi" ? "vi-VN" : "en-US";
  const d = new Date(iso);
  return withTime ? d.toLocaleString(tag) : d.toLocaleDateString(tag);
}
