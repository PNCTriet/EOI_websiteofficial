import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { t } from "@/i18n/translate";
import { getServerI18n } from "@/lib/server-i18n";
import { createClient } from "@/lib/supabase/server";
import { formatProductPrice } from "@/lib/format-locale";
import { getLocale } from "@/lib/locale";
import type { ProductRow } from "@/types/database";
import { badgeLabel } from "@/i18n/badge-label";
import { looksLikeProductHtml, stripHtmlForPreview } from "@/lib/product-description";
import { PLACEHOLDER_PRODUCTS } from "@/lib/placeholder-products";
import { Product3DThumb } from "@/components/store/product-3d-thumb";

type Props = { searchParams: Promise<{ q?: string }> };

function badgeStyles(badge: string | null): string {
  if (!badge) return "hidden";
  const u = badge.trim().toLowerCase();
  if (u === "hot") return "bg-eoi-pink-light text-eoi-pink-dark";
  if (u === "mới" || u === "moi" || u === "new") return "bg-eoi-blue-light text-eoi-blue-dark";
  if (u === "sale") return "bg-eoi-amber-light text-eoi-amber-dark";
  return "bg-eoi-border text-eoi-ink2";
}

function availabilityPillClass(av: string | undefined): string {
  if (av === "coming_soon") return "bg-violet-100 text-violet-800";
  if (av === "out_of_stock") return "bg-neutral-200 text-neutral-700";
  return "";
}

async function fetchProducts(q: string): Promise<ProductRow[]> {
  const supabase = await createClient();
  const pattern = `%${q}%`;
  const select =
    "id,name,description,price,material,category,delivery_days_min,delivery_days_max,image_urls,image_thumb_urls,stl_url,is_active,colors,accent_bg,badge,availability,created_at,updated_at";

  try {
    const { data, error } = await supabase
      .from("products")
      .select(select)
      .eq("is_active", true)
      .or(
        [
          `name.ilike.%${q}%`,
          `description.ilike.%${q}%`,
          `material.ilike.%${q}%`,
          `category.ilike.%${q}%`,
          `badge.ilike.%${q}%`,
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return [];
    return (data ?? []) as ProductRow[];
  } catch {
    // Fallback: chỉ tìm theo tên để tránh fail toàn bộ.
    try {
      const { data } = await supabase
        .from("products")
        .select(select)
        .eq("is_active", true)
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as ProductRow[];
    } catch {
      return [];
    }
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const locale = await getLocale();
  const { messages } = await getServerI18n();

  const products = query.length === 0 ? [] : await fetchProducts(query);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-6">
      <h1 className="flex items-center justify-center gap-2 font-syne text-2xl font-bold tracking-[-0.5px] text-eoi-ink">
        <Search size={22} strokeWidth={1.8} aria-hidden className="text-eoi-ink" />
        {t(messages, "store.searchTitle")}
      </h1>

      <form className="mt-5" method="GET" action="/search">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            name="q"
            defaultValue={query}
            placeholder={t(messages, "store.searchPlaceholder")}
            className="w-full rounded-[14px] border border-eoi-border bg-white px-4 py-3 font-dm text-sm text-eoi-ink placeholder:text-eoi-ink2/80"
          />
          <button
            type="submit"
            className="min-h-[44px] rounded-full bg-eoi-ink px-6 py-3 font-dm text-sm font-semibold text-white"
          >
            {t(messages, "store.searchTitle")}
          </button>
        </div>
      </form>

      {query.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-eoi-border bg-white p-6 text-center shadow-sm">
          <p className="font-dm text-sm text-eoi-ink2">{t(messages, "store.searchHint")}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-eoi-border bg-white p-6 text-center shadow-sm">
          <p className="font-dm text-sm text-eoi-ink2">{t(messages, "store.noSearchResults")}</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => {
            const poster = p.image_thumb_urls?.[0] ?? p.image_urls?.[0] ?? null;
            const avail = p.availability ?? "in_stock";
            const showAvail = avail === "coming_soon" || avail === "out_of_stock";
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group block rounded-2xl border border-eoi-border bg-eoi-surface transition-transform md:hover:scale-[1.035]"
              >
                <div
                  className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl"
                  style={{ background: p.accent_bg ?? "var(--eoi-pink-light)" }}
                >
                  {showAvail || p.badge ? (
                    <div className="absolute left-3 top-3 z-[50] flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-1">
                      {avail === "coming_soon" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 leading-tight font-dm text-[10px] font-bold uppercase tracking-wide ${availabilityPillClass(
                            "coming_soon"
                          )}`}
                        >
                          {t(messages, "store.availabilityComingSoon")}
                        </span>
                      ) : null}
                      {avail === "out_of_stock" ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 leading-tight font-dm text-[10px] font-bold uppercase tracking-wide ${availabilityPillClass(
                            "out_of_stock"
                          )}`}
                        >
                          {t(messages, "store.availabilityOutOfStock")}
                        </span>
                      ) : null}
                      {p.badge ? (
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 leading-tight font-dm text-[10px] font-bold uppercase tracking-wide ${badgeStyles(
                            p.badge
                          )}`}
                        >
                          {badgeLabel(messages, p.badge)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {p.stl_url ? (
                    <Product3DThumb stlUrl={p.stl_url} posterUrl={poster} />
                  ) : poster ? (
                    <Image
                      src={poster}
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
                  {p.description?.trim() ? (
                    <p className="mt-1 font-dm text-[11px] text-[#888888] line-clamp-2">
                      {looksLikeProductHtml(p.description)
                        ? stripHtmlForPreview(p.description)
                        : p.description}
                    </p>
                  ) : (
                    <p className="mt-1 font-dm text-[11px] text-[#888888] line-clamp-1">
                      {p.material ?? "—"}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-syne text-[15px] font-extrabold tracking-[-0.5px] text-eoi-ink">
                      {formatProductPrice(locale, p.price, t(messages, "store.priceNotSet"))}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
