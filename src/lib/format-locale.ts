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

/** Giá gốc hợp lệ để hiển thị gạch ngang + giá bán. */
export function productHasActiveDiscount(
  price: number | null | undefined,
  compareAt: number | null | undefined
): boolean {
  if (price == null || Number.isNaN(price)) return false;
  if (compareAt == null || Number.isNaN(compareAt)) return false;
  return compareAt > price;
}

export function discountPercentOff(
  price: number,
  compareAt: number
): number | null {
  if (compareAt <= 0 || compareAt <= price) return null;
  return Math.round((1 - price / compareAt) * 100);
}

export function formatDate(
  locale: Locale,
  iso: string,
  withTime?: boolean
): string {
  const tag = locale === "vi" ? "vi-VN" : "en-US";
  const d = new Date(iso);
  // Supabase stores timestamptz in UTC; format for display in Vietnam time.
  const timeZone = "Asia/Ho_Chi_Minh";
  return withTime
    ? d.toLocaleString(tag, { timeZone })
    : d.toLocaleDateString(tag, { timeZone });
}
