import type { Messages } from "@/i18n/dictionaries";
import { translate } from "@/i18n/translate";

/** Slugs that map to `store.categories.*` in dictionaries */
export const STORE_CATEGORY_SLUGS = [
  "decor",
  "scene",
  "office",
  "gift",
] as const;

export type StoreCategorySlug = (typeof STORE_CATEGORY_SLUGS)[number];

export function isStoreCategorySlug(
  value: string
): value is StoreCategorySlug {
  return (STORE_CATEGORY_SLUGS as readonly string[]).includes(value);
}

/** Label for product chip: localized preset or raw custom string */
export function storeCategoryLabel(
  messages: Messages,
  category: string | null | undefined
): string {
  const raw = category?.trim();
  if (!raw) {
    return translate(messages, "store.productFallbackCategory");
  }
  const slug = raw.toLowerCase();
  if (isStoreCategorySlug(slug)) {
    const path = `store.categories.${slug}`;
    const label = translate(messages, path);
    if (label !== path) return label;
  }
  return raw;
}
