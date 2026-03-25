import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createClientWithoutCookies } from "@/lib/supabase/server";
import { CategoryChips } from "@/components/category-chips";
import { badgeLabel } from "@/i18n/badge-label";
import { getDictionary } from "@/i18n/dictionaries";
import { t as translateMsg } from "@/i18n/translate";
import { formatProductPrice } from "@/lib/format-locale";
import { getLocale } from "@/lib/locale";
import {
  looksLikeProductHtml,
  stripHtmlForPreview,
} from "@/lib/product-description";
import { PLACEHOLDER_PRODUCTS } from "@/lib/placeholder-products";
import type { ProductRow } from "@/types/database";

async function fetchProductsUncached(): Promise<ProductRow[]> {
  try {
    const supabase = createClientWithoutCookies();
    const selectWithThumb =
      "id,name,description,price,material,category,delivery_days_min,delivery_days_max,image_urls,image_thumb_urls,stl_url,is_active,colors,accent_bg,badge,availability,created_at,updated_at";
    const selectWithoutThumb =
      "id,name,description,price,material,category,delivery_days_min,delivery_days_max,image_urls,stl_url,is_active,colors,accent_bg,badge,availability,created_at,updated_at";

    async function load(includeThumb: boolean): Promise<{
      data: ProductRow[] | null;
      error: unknown;
    }> {
      const select = includeThumb ? selectWithThumb : selectWithoutThumb;
      const { data, error } = await supabase
        .from("products")
        .select(select)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return { data: (data as ProductRow[] | null) ?? null, error };
    }

    const first = await load(true);
    const firstError =
      typeof first.error === "object" && first.error
        ? // supabase error has shape { message: string }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (first.error as any).message
        : undefined;

    if (firstError) {
      console.warn("[store] fetchProducts: first query failed", {
        message: String(firstError),
      });
    }

    if (!firstError && first.data?.length) return first.data;
    if (!firstError && !first.data?.length) {
      console.warn(
        "[store] fetchProducts: no rows returned (is_active=true?)"
      );
    }

    // If thumbnail migration hasn't been applied yet, retry without `image_thumb_urls`.
    if (firstError && /image_thumb_urls/i.test(firstError)) {
      const retry = await load(false);
      if (retry.data?.length) return retry.data;
    }

    return PLACEHOLDER_PRODUCTS;
  } catch (err) {
    console.warn("[store] fetchProducts: unexpected error", err);
    return PLACEHOLDER_PRODUCTS;
  }
}

const fetchProducts = unstable_cache(fetchProductsUncached, ["active-products"], {
  // Dev: giảm để tránh "dính" placeholder do cache cũ.
  // Prod: 1 giờ
  revalidate: process.env.NODE_ENV === "development" ? 10 : 60 * 60,
});

function badgeStyles(badge: string | null): string {
  if (!badge) return "hidden";
  const u = badge.trim().toLowerCase();
  if (u === "hot") return "bg-eoi-pink-light text-eoi-pink-dark";
  if (u === "mới" || u === "moi" || u === "new")
    return "bg-eoi-blue-light text-eoi-blue-dark";
  if (u === "sale") return "bg-eoi-amber-light text-eoi-amber-dark";
  return "hidden";
}

function availabilityPillClass(av: string | undefined): string {
  if (av === "coming_soon")
    return "bg-violet-100 text-violet-800";
  if (av === "out_of_stock") return "bg-neutral-200 text-neutral-700";
  return "";
}

function addButtonColor(i: number): string {
  const colors = ["bg-eoi-pink", "bg-eoi-blue", "bg-eoi-amber"];
  return colors[i % colors.length] ?? "bg-eoi-pink";
}

export default async function StoreHomePage() {
  const locale = await getLocale();
  const messages = getDictionary(locale);
  const t = (path: string, vars?: Record<string, string>) =>
    translateMsg(messages, path, vars);

  const products = await fetchProducts();

  return (
    <div className="space-y-8 px-5 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-2xl bg-eoi-ink px-5 py-8 md:px-8 md:py-10">
        <div className="relative z-10 max-w-lg">
          <span className="inline-block rounded-full bg-eoi-pink px-3 py-1 font-dm text-[10px] font-bold uppercase tracking-wide text-white">
            {t("store.heroEyebrow")}
          </span>
          <h1 className="mt-4 font-syne text-3xl font-extrabold leading-tight tracking-[-1px] text-white md:text-4xl">
            {t("store.heroTitleBefore")}
            <span className="text-eoi-amber">{t("store.heroTitleAccent")}</span>
            {t("store.heroTitleAfter")}
          </h1>
          <p className="mt-3 max-w-sm font-dm text-sm font-normal leading-snug text-[#aaaaaa] line-clamp-2">
            {t("store.heroDescription")}
          </p>
          <Link
            href="/#noi-bat"
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-eoi-pink px-5 py-3 font-dm text-sm font-semibold text-white"
          >
            {t("store.exploreNow")}
            <ArrowRight size={18} strokeWidth={2} aria-hidden />
          </Link>
        </div>
        <div
          className="pointer-events-none absolute -right-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-eoi-blue opacity-20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-12 top-4 h-28 w-28 rounded-full bg-eoi-amber opacity-25 blur-2xl"
          aria-hidden
        />
      </section>

      <section aria-label={t("store.categoriesSectionAria")}>
        <CategoryChips />
      </section>

      <section id="noi-bat" className="scroll-mt-24">
        <h2 className="mb-4 font-syne text-lg font-bold tracking-[-0.5px] text-eoi-ink">
          {t("store.featured")}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group block rounded-2xl border border-eoi-border bg-eoi-surface"
            >
              <div
                className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl"
                style={{ background: p.accent_bg ?? "var(--eoi-pink-light)" }}
              >
                {(() => {
                  const avail = p.availability ?? "in_stock";
                  const showAvail =
                    avail === "coming_soon" || avail === "out_of_stock";
                  if (!showAvail && !p.badge) return null;
                  return (
                    <div className="absolute left-2 top-2 z-[1] flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
                      {avail === "coming_soon" ? (
                        <span
                          className={`rounded-full px-2 py-1 font-dm text-[10px] font-bold uppercase tracking-wide ${availabilityPillClass("coming_soon")}`}
                        >
                          {t("store.availabilityComingSoon")}
                        </span>
                      ) : null}
                      {avail === "out_of_stock" ? (
                        <span
                          className={`rounded-full px-2 py-1 font-dm text-[10px] font-bold uppercase tracking-wide ${availabilityPillClass("out_of_stock")}`}
                        >
                          {t("store.availabilityOutOfStock")}
                        </span>
                      ) : null}
                      {p.badge ? (
                        <span
                          className={`rounded-full px-2 py-1 font-dm text-[10px] font-bold uppercase tracking-wide ${badgeStyles(p.badge)}`}
                        >
                          {badgeLabel(messages, p.badge)}
                        </span>
                      ) : null}
                    </div>
                  );
                })()}
                {(p.image_thumb_urls?.[0] ?? p.image_urls?.[0]) ? (
                  <Image
                    src={p.image_thumb_urls?.[0] ?? p.image_urls?.[0] ?? ""}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-syne text-2xl font-extrabold text-eoi-ink/20">
                      3D
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-syne text-[13px] font-bold leading-tight text-eoi-ink line-clamp-2">
                  {p.name}
                </p>
                <p
                  className={`mt-1 font-dm text-[11px] text-[#888888] line-clamp-1 ${
                    p.description?.trim() ? "mb-1" : "mb-2"
                  }`}
                >
                  {p.material ?? t("common.dash")}
                </p>
                {p.description?.trim() ? (
                  <p
                    className={`mb-2 font-dm text-[11px] leading-snug text-[#888888] line-clamp-4 ${
                      looksLikeProductHtml(p.description)
                        ? ""
                        : "whitespace-pre-line"
                    }`}
                  >
                    {looksLikeProductHtml(p.description)
                      ? stripHtmlForPreview(p.description)
                      : p.description}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-syne text-[15px] font-extrabold tracking-[-0.5px] text-eoi-ink">
                    {formatProductPrice(locale, p.price, t("store.priceNotSet"))}
                  </span>
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white ${addButtonColor(i)}`}
                    aria-hidden
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
