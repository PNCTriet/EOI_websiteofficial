"use client";

import { useMemo, useState } from "react";
import type { ProductRow, ProductVariantRow } from "@/types/database";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { ProductDescription } from "@/components/product-description";
import {
  ProductDetailActions,
  ProductVariantPicker,
} from "@/components/product-detail-actions";
import {
  useLocaleContext,
  useTranslations,
} from "@/components/locale-provider";
import { formatProductPrice } from "@/lib/format-locale";
import { storeCategoryLabel } from "@/lib/product-taxonomy";
import {
  defaultAvailability,
  isProductAvailability,
} from "@/lib/product-availability";
import { galleryForVariant } from "@/lib/product-variant-images";

type Props = {
  product: ProductRow;
  variants: ProductVariantRow[];
};

export function ProductDetailView({ product, variants }: Props) {
  const t = useTranslations();
  const { locale, messages } = useLocaleContext();
  const sorted = useMemo(
    () => [...variants].sort((a, b) => a.sort_order - b.sort_order),
    [variants],
  );
  const [variantId, setVariantId] = useState(() => sorted[0]?.id ?? "");
  /** Chưa bấm mã: gallery = ảnh chung SP (list cũ). Sau khi bấm: gallery theo phiên bản. */
  const [variantGalleryEngaged, setVariantGalleryEngaged] = useState(false);
  const selected =
    sorted.find((v) => v.id === variantId) ?? sorted[0] ?? null;

  const { urls, thumbs } = useMemo(() => {
    if (sorted.length === 0 || !variantGalleryEngaged) {
      const pu = product.image_urls?.filter(Boolean) ?? [];
      const pt = product.image_thumb_urls?.filter(Boolean) ?? [];
      return {
        urls: pu,
        thumbs: pt.length >= pu.length ? pt : pu,
      };
    }
    return galleryForVariant(product, selected);
  }, [sorted.length, variantGalleryEngaged, product, selected]);

  function handleSelectVariant(id: string) {
    setVariantId(id);
    setVariantGalleryEngaged(true);
  }

  const deliveryMin = product.delivery_days_min ?? 3;
  const deliveryMax = product.delivery_days_max ?? 5;
  const availability = isProductAvailability(product.availability)
    ? product.availability
    : defaultAvailability();

  const defaultDesc = t("store.productDefaultDescription");

  return (
    <>
      <ProductImageGallery
        key={
          variantGalleryEngaged
            ? (selected?.id ?? "variant")
            : "product-gallery"
        }
        imageUrls={urls.length ? urls : product.image_urls}
        thumbUrls={thumbs.length ? thumbs : product.image_thumb_urls}
        accentBg={product.accent_bg}
      />

      {sorted.length > 0 ? (
        <div className="mx-auto mt-4 max-w-lg">
          <ProductVariantPicker
            variants={sorted}
            selectedVariantId={selected?.id ?? variantId}
            onSelectVariant={handleSelectVariant}
            variantGalleryEngaged={variantGalleryEngaged}
          />
        </div>
      ) : null}

      <div className="mx-auto mt-6 max-w-lg space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-eoi-blue-light px-3 py-1 font-dm text-[11px] font-semibold text-eoi-blue-dark">
            {storeCategoryLabel(messages, product.category)}
          </span>
          {availability === "coming_soon" ? (
            <span className="inline-block rounded-full bg-violet-100 px-3 py-1 font-dm text-[11px] font-semibold text-violet-800">
              {t("store.availabilityComingSoon")}
            </span>
          ) : null}
          {availability === "out_of_stock" ? (
            <span className="inline-block rounded-full bg-neutral-200 px-3 py-1 font-dm text-[11px] font-semibold text-neutral-700">
              {t("store.availabilityOutOfStock")}
            </span>
          ) : null}
        </div>
        <h1 className="font-syne text-2xl font-extrabold tracking-[-1px] text-eoi-ink md:text-[26px]">
          {product.name}
        </h1>
        <p className="font-dm text-[13px] text-eoi-ink2">
          {product.material ?? t("common.dash")}{" "}
          {t("store.shippingEstimateRange", {
            min: String(deliveryMin),
            max: String(deliveryMax),
          })}
        </p>
        <p className="font-syne text-[28px] font-extrabold tracking-[-0.5px] text-eoi-ink">
          {formatProductPrice(locale, product.price, t("store.priceNotSet"))}
        </p>
        <ProductDescription
          content={product.description}
          fallback={
            <div className="whitespace-pre-line font-dm text-[13px] leading-relaxed text-eoi-ink2">
              {defaultDesc}
            </div>
          }
        />

        <ProductDetailActions
          product={product}
          variants={sorted}
          selectedVariantId={selected?.id ?? variantId}
          variantGalleryEngaged={variantGalleryEngaged}
        />
      </div>
    </>
  );
}
