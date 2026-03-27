import Link from "next/link";
import Image from "next/image";
import { Instagram, Plus, AtSign } from "lucide-react";
import { createClientWithoutCookies } from "@/lib/supabase/server";
import { CategoryChips } from "@/components/category-chips";
import { badgeLabel } from "@/i18n/badge-label";
import { getDictionary } from "@/i18n/dictionaries";
import { t as translateMsg } from "@/i18n/translate";
import { formatProductPrice } from "@/lib/format-locale";
import { getLocale } from "@/lib/locale";
import { Product3DThumb } from "@/components/store/product-3d-thumb";
import {
  looksLikeProductHtml,
  stripHtmlForPreview,
} from "@/lib/product-description";
import type { ProductRow } from "@/types/database";

type ProductFetchState = {
  products: ProductRow[];
  maintenance: boolean;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchProductsUncached(): Promise<ProductFetchState> {
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
        ? (() => {
            const maybeMessage = (
              first.error as { message?: unknown }
            ).message;
            return typeof maybeMessage === "string"
              ? maybeMessage
              : undefined;
          })()
        : undefined;

    if (firstError) {
      console.warn("[store] fetchProducts: first query failed", {
        message: String(firstError),
      });
    }

    if (!firstError && first.data?.length) {
      return { products: first.data, maintenance: false };
    }
    if (!firstError && !first.data?.length) {
      console.warn(
        "[store] fetchProducts: no rows returned (is_active=true?)"
      );
      return { products: [], maintenance: false };
    }

    // If thumbnail migration hasn't been applied yet, retry without `image_thumb_urls`.
    if (firstError && /image_thumb_urls/i.test(firstError)) {
      const retry = await load(false);
      if (retry.data?.length) {
        return { products: retry.data, maintenance: false };
      }
    }

    return { products: [], maintenance: true };
  } catch (err) {
    console.warn("[store] fetchProducts: unexpected error", err);
    return { products: [], maintenance: true };
  }
}

function badgeStyles(badge: string | null): string {
  if (!badge) return "hidden";
  const u = badge.trim().toLowerCase();
  if (u === "hot") return "bg-eoi-pink-light text-eoi-pink-dark";
  if (u === "mới" || u === "moi" || u === "new")
    return "bg-eoi-blue-light text-eoi-blue-dark";
  if (u === "sale") return "bg-eoi-amber-light text-eoi-amber-dark";
  // Any other custom tag from DB (e.g. "Design Lamp") should still be visible.
  return "bg-eoi-border text-eoi-ink2";
}

function parseBadgeTags(badge: string | null): string[] {
  if (!badge?.trim()) return [];
  return badge
    .split(/[,\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
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

  const { products, maintenance } = await fetchProductsUncached();
  const socialThreads = "https://www.threads.com/@eoilinhtinh";
  const socialInstagram = "https://www.instagram.com/eoilinhtinh/";
  const availableCategoryIds = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    )
  );

  return (
    <div className="space-y-8 px-5 py-6 md:px-6">
      {maintenance ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-md rounded-2xl border border-eoi-border bg-white p-5 shadow-xl">
            <h2 className="font-syne text-xl font-bold text-eoi-ink">
              Hệ thống đang bảo trì
            </h2>
            <p className="mt-2 font-dm text-sm text-eoi-ink2">
              Cửa hàng đang cập nhật dữ liệu. Vui lòng quay lại sau hoặc liên hệ qua Instagram để được hỗ trợ nhanh.
            </p>
            <div className="mt-4">
              <a
                href={socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-eoi-blue px-5 font-dm text-sm font-semibold text-white"
              >
                Instagram @eolinhtinh
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <section
        className="relative aspect-[1103/316] w-full overflow-hidden rounded-2xl bg-eoi-ink md:aspect-[1103/316]"
        aria-label={t("store.heroVideoAria")}
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src="/image/video/thumnail.mp4" type="video/mp4" />
          <source src="/image/video/thumnail.MOV" type="video/quicktime" />
        </video>
        <div className="absolute inset-0 bg-black/55" aria-hidden />

        <div className="absolute inset-0 z-10 flex flex-col justify-end">
          <div className="flex flex-col gap-3 p-5 pb-6 md:p-8 md:pb-8">
            <p className="font-dm text-sm font-medium text-white/90">
              {t("store.heroVideoSocialTitle")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <a
                href={socialThreads}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("store.heroSocialThreadsAria")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-eoi-pink px-4 py-2.5 font-dm text-sm font-bold text-white shadow-md transition hover:brightness-110"
              >
                <AtSign className="h-5 w-5 shrink-0" strokeWidth={2.2} aria-hidden />
                <span>{t("store.heroSocialThreadsLabel")}</span>
              </a>
              <a
                href={socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("store.heroSocialInstagramAria")}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-eoi-blue px-4 py-2.5 font-dm text-sm font-bold text-white shadow-md transition hover:brightness-110"
              >
                <Instagram className="h-5 w-5 shrink-0" strokeWidth={2.2} aria-hidden />
                <span>{t("store.heroSocialInstagramHandle")}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={t("store.categoriesSectionAria")}>
        <CategoryChips availableCategoryIds={availableCategoryIds} />
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
              className="group block rounded-2xl border border-eoi-border bg-eoi-surface transition-transform duration-300 will-change-transform md:hover:scale-[1.02]"
            >
              <div
                className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl"
                style={{ background: p.accent_bg ?? "var(--eoi-pink-light)" }}
              >
                {(() => {
                  const avail = p.availability ?? "in_stock";
                  const showAvail =
                    avail === "coming_soon" || avail === "out_of_stock";
                  const badgeTags = parseBadgeTags(p.badge);
                  if (!showAvail && badgeTags.length === 0) return null;
                  return (
                    <div className="absolute left-3 top-3 z-[50] flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-1">
                      {avail === "coming_soon" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 leading-tight font-dm text-[10px] font-bold uppercase tracking-wide ${availabilityPillClass("coming_soon")}`}
                        >
                          {t("store.availabilityComingSoon")}
                        </span>
                      ) : null}
                      {avail === "out_of_stock" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 leading-tight font-dm text-[10px] font-bold uppercase tracking-wide ${availabilityPillClass("out_of_stock")}`}
                        >
                          {t("store.availabilityOutOfStock")}
                        </span>
                      ) : null}
                      {badgeTags.map((tag, idx) => (
                        <span
                          key={`${p.id}-badge-${idx}-${tag}`}
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 leading-tight font-dm text-[10px] font-bold uppercase tracking-wide ${badgeStyles(tag)}`}
                        >
                          {badgeLabel(messages, tag)}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {(() => {
                  const poster = p.image_thumb_urls?.[0] ?? p.image_urls?.[0] ?? null;
                  const stl = p.stl_url;
                  if (stl) {
                    return (
                      <Product3DThumb stlUrl={stl} posterUrl={poster} />
                    );
                  }

                  if (poster) {
                    return (
                      <Image
                        src={poster}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover object-center"
                        priority={i < 4}
                        loading={i < 4 ? "eager" : "lazy"}
                        fetchPriority={i < 4 ? "high" : "auto"}
                      />
                    );
                  }

                  return (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="font-syne text-2xl font-extrabold text-eoi-ink/20">
                        3D
                      </span>
                    </div>
                  );
                })()}
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
