import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/dictionaries";
import { t } from "@/i18n/translate";
import { ProductDetailView } from "@/components/store/product-detail-view";
import {
  defaultAvailability,
  isProductAvailability,
} from "@/lib/product-availability";
import { getLocale } from "@/lib/locale";
import type { ProductRow, ProductVariantRow } from "@/types/database";
import { brandAssets } from "@/lib/brand-assets";
import { getSiteOriginString, toAbsoluteSiteUrl } from "@/lib/site-url";
import { stripHtmlForPreview } from "@/lib/product-description";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductFetchState = {
  product: ProductRow | null;
  maintenance: boolean;
};

async function getProduct(id: string): Promise<ProductFetchState> {
  try {
    const supabase = await createClient();
    const selectWithThumb =
      "id,name,description,price,compare_at_price,material,category,delivery_days_min,delivery_days_max,image_urls,image_thumb_urls,stl_url,is_active,colors,accent_bg,badge,availability,created_at,updated_at";
    const selectWithoutThumb =
      "id,name,description,price,compare_at_price,material,category,delivery_days_min,delivery_days_max,image_urls,stl_url,is_active,colors,accent_bg,badge,availability,created_at,updated_at";

    async function load(includeThumb: boolean): Promise<{
      data: ProductRow | null;
      error: unknown;
    }> {
      const select = includeThumb ? selectWithThumb : selectWithoutThumb;
      const { data, error } = await supabase
        .from("products")
        .select(select)
        .eq("id", id)
        .single();
      return { data: (data as ProductRow | null) ?? null, error };
    }

    const first = await load(true);

    // Happy path
    if (!first.error && first.data) return { product: first.data, maintenance: false };

    // If thumbnail migration hasn't been applied yet, retry without `image_thumb_urls`.
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

    if (firstError && /image_thumb_urls/i.test(firstError)) {
      const retry = await load(false);
      if (!retry.error && retry.data) {
        return { product: retry.data, maintenance: false };
      }
    }
    // Query failed for reasons other than not found.
    if (first.error) {
      return { product: null, maintenance: true };
    }
  } catch {
    return { product: null, maintenance: true };
  }
  return { product: null, maintenance: false };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const messages = getDictionary(locale);
  const tr = (path: string, vars?: Record<string, string>) => t(messages, path, vars);
  const origin = getSiteOriginString();
  const productUrl = `${origin}/products/${id}`;
  const { product, maintenance } = await getProduct(id);

  if (maintenance) {
    const title = "EOI — Hệ thống đang bảo trì";
    const description =
      "Không thể tải dữ liệu sản phẩm lúc này. Vui lòng quay lại sau hoặc liên hệ Instagram @eolinhtinh.";
    return {
      title,
      description,
      alternates: { canonical: productUrl },
      openGraph: {
        type: "website",
        title,
        description,
        url: productUrl,
        siteName: "EOI - Design Printing",
        images: [{ url: toAbsoluteSiteUrl(brandAssets.ogImage), type: "image/png" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [toAbsoluteSiteUrl(brandAssets.ogImage)],
      },
    };
  }

  if (!product) {
    const title = tr("store.productNotFound");
    const description = tr("store.backToStore");
    return {
      title,
      description,
      alternates: { canonical: productUrl },
      openGraph: {
        type: "website",
        title,
        description,
        url: productUrl,
        siteName: "EOI - Design Printing",
        images: [{ url: toAbsoluteSiteUrl(brandAssets.ogImage), type: "image/png" }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [toAbsoluteSiteUrl(brandAssets.ogImage)],
      },
    };
  }

  const image =
    product.image_thumb_urls?.[0] ?? product.image_urls?.[0] ?? brandAssets.ogImage;
  const title = `${product.name} | EOI`;
  const descriptionRaw = product.description?.trim()
    ? stripHtmlForPreview(product.description)
    : tr("store.productDefaultDescription");
  const description =
    descriptionRaw.length > 180 ? `${descriptionRaw.slice(0, 177).trimEnd()}...` : descriptionRaw;

  const imageForMeta = toAbsoluteSiteUrl(image);

  return {
    title,
    description,
    alternates: { canonical: productUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: productUrl,
      siteName: "EOI - Design Printing",
      images: [{ url: imageForMeta }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageForMeta],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const { product, maintenance } = await getProduct(id);
  const instagramUrl =
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL?.trim() ||
    "https://www.instagram.com/eolinhtinh/";

  if (maintenance) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-6">
        <div className="rounded-2xl border border-eoi-border bg-white p-6 shadow-sm">
          <h1 className="font-syne text-2xl font-bold text-eoi-ink">Hệ thống đang bảo trì</h1>
          <p className="mt-2 font-dm text-sm text-eoi-ink2">
            Không thể tải dữ liệu sản phẩm từ Supabase lúc này. Vui lòng thử lại sau hoặc liên hệ Instagram.
          </p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-eoi-blue px-5 font-dm text-sm font-semibold text-white"
          >
            Instagram @eolinhtinh
          </a>
        </div>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const supabase = await createClient();
  const { data: variantRows } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true });
  const variants = (variantRows ?? []) as ProductVariantRow[];

  const messages = getDictionary(await getLocale());
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const defaultDesc = tr("store.productDefaultDescription");
  const availability = isProductAvailability(product.availability)
    ? product.availability
    : defaultAvailability();

  const origin = getSiteOriginString();

  const firstImage = toAbsoluteSiteUrl(
    product.image_urls?.[0] ?? brandAssets.ogImage,
  );
  const schemaAvailability =
    availability === "in_stock"
      ? "https://schema.org/InStock"
      : availability === "coming_soon"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/OutOfStock";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [firstImage],
    description: product.description ?? defaultDesc,
    brand: { "@type": "Brand", name: "EOI" },
    sku: product.id,
    category: product.category ?? undefined,
    offers:
      product.price != null
        ? {
            "@type": "Offer",
            priceCurrency: "VND",
            price: product.price,
            availability: schemaAvailability,
            url: `${origin}/products/${product.id}`,
          }
        : {
            "@type": "Offer",
            availability: schemaAvailability,
            url: `${origin}/products/${product.id}`,
          },
  };

  return (
    <div className="px-5 pb-10 pt-2 md:px-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd),
        }}
      />
      <div className="relative mx-auto max-w-lg">
        <Link
          href="/"
          className="absolute left-0 top-3 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 text-eoi-ink shadow-sm backdrop-blur"
          aria-label={tr("common.back")}
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </Link>
        <ProductDetailView product={product} variants={variants} />
      </div>
    </div>
  );
}
