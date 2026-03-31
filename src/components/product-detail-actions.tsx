"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { ProductRow, ProductVariantRow } from "@/types/database";
import { useCart } from "@/components/cart/cart-context";
import { useTranslations } from "@/components/locale-provider";
import {
  defaultAvailability,
  isProductAvailability,
  isPurchasable,
} from "@/lib/product-availability";
import { primaryImageForVariant } from "@/lib/product-variant-images";

type Props = {
  product: ProductRow;
  variants: ProductVariantRow[];
  selectedVariantId: string;
  /** false = gallery đang hiện ảnh SP chung; ảnh giỏ dùng ảnh chung */
  variantGalleryEngaged: boolean;
};

type VariantPickerProps = {
  variants: ProductVariantRow[];
  selectedVariantId: string;
  onSelectVariant: (id: string) => void;
  /** Chưa bấm mã: không highlight, gallery là ảnh sản phẩm */
  variantGalleryEngaged: boolean;
};

/** Variant chips — dùng ngay dưới gallery để đổi ảnh dễ nhìn */
export function ProductVariantPicker({
  variants,
  selectedVariantId,
  onSelectVariant,
  variantGalleryEngaged,
}: VariantPickerProps) {
  const t = useTranslations();
  const selected =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  if (variants.length === 0) return null;

  return (
    <div className="rounded-2xl border border-eoi-border/80 bg-white/90 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4">
      <p className="mb-2 font-dm text-xs font-medium text-eoi-ink2">
        {t("store.variantOptions")}
      </p>
      {!variantGalleryEngaged ? (
        <p className="mb-3 font-dm text-[11px] leading-snug text-eoi-ink2/90">
          {t("store.variantGalleryHint")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const active = variantGalleryEngaged && v.id === selected?.id;
          const hex = v.color_hex?.trim() || "#94A3B8";
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVariant(v.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 px-3 py-2 font-dm text-xs font-semibold transition ${
                active
                  ? "border-eoi-ink bg-eoi-surface text-eoi-ink"
                  : "border-eoi-border bg-white text-eoi-ink2 hover:border-eoi-ink/40"
              }`}
              aria-pressed={active}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-eoi-border/50"
                style={{ backgroundColor: hex }}
                aria-hidden
              />
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductDetailActions({
  product,
  variants,
  selectedVariantId,
  variantGalleryEngaged,
}: Props) {
  const t = useTranslations();
  const { addItem } = useCart();
  const availability = isProductAvailability(product.availability)
    ? product.availability
    : defaultAvailability();
  const canPurchase =
    isPurchasable(availability) &&
    product.price != null &&
    !Number.isNaN(product.price);

  const selected =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const cartImageUrl =
    variantGalleryEngaged && selected
      ? primaryImageForVariant(product, selected)
      : product.image_thumb_urls?.[0] ??
        product.image_urls?.[0] ??
        primaryImageForVariant(product, selected ?? null);
  const swatchHex =
    selected?.color_hex?.trim() ||
    product.colors?.[0] ||
    "#111111";

  function handleAddToCart() {
    setError(null);
    setJustAdded(false);
    if (!canPurchase || product.price == null || !selected) return;
    setSubmitting(true);
    try {
      addItem({
        productId: product.id,
        variantId: selected.id,
        variantLabel: selected.label,
        name: product.name,
        price: product.price,
        imageUrl: cartImageUrl,
        colorHex: swatchHex,
        quantity: 1,
      });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2800);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {!canPurchase ? (
        <p className="rounded-xl bg-eoi-surface px-3 py-2.5 font-dm text-xs font-medium text-eoi-ink2">
          {availability === "coming_soon"
            ? t("store.cannotAddToCartComingSoon")
            : t("store.cannotAddToCartOutOfStock")}
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={submitting || !canPurchase || !selected}
          onClick={handleAddToCart}
          className="min-h-[44px] flex-1 rounded-full bg-eoi-ink px-5 py-3 font-dm text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? t("store.addingToCart") : t("store.addToCart")}
        </button>
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-eoi-border bg-white text-eoi-ink"
          aria-label={t("store.favorite")}
        >
          <Heart size={18} strokeWidth={2} />
        </button>
      </div>

      {justAdded ? (
        <p
          className="rounded-xl bg-green-50 px-3 py-2.5 font-dm text-xs font-medium text-green-800"
          role="status"
        >
          {t("store.cartAdded")}
        </p>
      ) : null}

      {error ? (
        <p className="font-dm text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
