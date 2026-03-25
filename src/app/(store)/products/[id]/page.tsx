import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/i18n/dictionaries";
import { t } from "@/i18n/translate";
import { ProductDescription } from "@/components/product-description";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { formatProductPrice } from "@/lib/format-locale";
import {
  defaultAvailability,
  isProductAvailability,
} from "@/lib/product-availability";
import { getLocale } from "@/lib/locale";
import { PLACEHOLDER_PRODUCTS } from "@/lib/placeholder-products";
import { storeCategoryLabel } from "@/lib/product-taxonomy";
import type { ProductRow } from "@/types/database";
import { brandAssets } from "@/lib/brand-assets";

type Props = { params: Promise<{ id: string }> };

async function getProduct(id: string): Promise<ProductRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,description,price,material,category,delivery_days_min,delivery_days_max,image_urls,stl_url,is_active,colors,accent_bg,badge,availability,created_at,updated_at"
      )
      .eq("id", id)
      .single();
    if (!error && data) {
      return data as ProductRow;
    }
  } catch {
    /* fall through */
  }
  const fromPlaceholder = PLACEHOLDER_PRODUCTS.find((p) => p.id === id);
  return fromPlaceholder ?? null;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) {
    notFound();
  }

  const locale = await getLocale();
  const messages = getDictionary(locale);
  const tr = (path: string, vars?: Record<string, string>) =>
    t(messages, path, vars);

  const defaultDesc = tr("store.productDefaultDescription");
  const deliveryMin = product.delivery_days_min ?? 3;
  const deliveryMax = product.delivery_days_max ?? 5;
  const availability = isProductAvailability(product.availability)
    ? product.availability
    : defaultAvailability();

  const origin = (() => {
    const raw =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    try {
      return new URL(raw ?? "http://localhost:3000").origin;
    } catch {
      return "http://localhost:3000";
    }
  })();

  const firstImage = product.image_urls?.[0] ?? brandAssets.ogImage;
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
        <ProductImageGallery
          key={product.id}
          imageUrls={product.image_urls}
          accentBg={product.accent_bg}
        />
      </div>

      <div className="mx-auto mt-6 max-w-lg space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-eoi-blue-light px-3 py-1 font-dm text-[11px] font-semibold text-eoi-blue-dark">
            {storeCategoryLabel(messages, product.category)}
          </span>
          {availability === "coming_soon" ? (
            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 font-dm text-[11px] font-semibold text-violet-800">
              {tr("store.availabilityComingSoon")}
            </span>
          ) : null}
          {availability === "out_of_stock" ? (
            <span className="inline-block rounded-full bg-neutral-200 px-3 py-1 font-dm text-[11px] font-semibold text-neutral-700">
              {tr("store.availabilityOutOfStock")}
            </span>
          ) : null}
        </div>
        <h1 className="font-syne text-2xl font-extrabold tracking-[-1px] text-eoi-ink md:text-[26px]">
          {product.name}
        </h1>
        <p className="font-dm text-[13px] text-eoi-ink2">
          {product.material ?? tr("common.dash")}{" "}
          {tr("store.shippingEstimateRange", {
            min: String(deliveryMin),
            max: String(deliveryMax),
          })}
        </p>
        <p className="font-syne text-[28px] font-extrabold tracking-[-0.5px] text-eoi-ink">
          {formatProductPrice(locale, product.price, tr("store.priceNotSet"))}
        </p>
        <ProductDescription
          content={product.description}
          fallback={
            <div className="whitespace-pre-line font-dm text-[13px] leading-relaxed text-eoi-ink2">
              {defaultDesc}
            </div>
          }
        />

        <ProductDetailActions product={product} />
      </div>
    </div>
  );
}
