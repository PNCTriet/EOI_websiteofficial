"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { ProductRow } from "@/types/database";
import { useCart } from "@/components/cart/cart-context";
import { useTranslations } from "@/components/locale-provider";
import {
  defaultAvailability,
  isProductAvailability,
  isPurchasable,
} from "@/lib/product-availability";

type Props = {
  product: ProductRow;
};

export function ProductDetailActions({ product }: Props) {
  const t = useTranslations();
  const { addItem } = useCart();
  const availability = isProductAvailability(product.availability)
    ? product.availability
    : defaultAvailability();
  const canPurchase =
    isPurchasable(availability) &&
    product.price != null &&
    !Number.isNaN(product.price);
  const colors = product.colors?.length
    ? product.colors
    : ["#F472B6", "#3B82F6", "#F59E0B", "#111111"];
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const images = product.image_urls ?? [];
  const cartImageUrl =
    images.length > 0
      ? images[Math.min(selected, images.length - 1)] ?? images[0]
      : null;
  const colorHex = colors[selected] ?? "#111111";

  function handleAddToCart() {
    setError(null);
    setJustAdded(false);
    if (!canPurchase || product.price == null) return;
    setSubmitting(true);
    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: cartImageUrl,
        colorIndex: selected,
        colorHex,
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
      <div>
        <p className="mb-2 font-dm text-xs font-medium text-eoi-ink2">
          {t("store.colors")}
        </p>
        <div className="flex flex-wrap gap-2">
          {colors.map((hex, i) => (
            <button
              key={`${hex}-${i}`}
              type="button"
              onClick={() => setSelected(i)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-transparent ${
                selected === i ? "outline outline-2 outline-offset-2 outline-eoi-ink" : ""
              }`}
              aria-label={t("store.colorNumber", { n: String(i + 1) })}
            >
              <span
                className="block h-7 w-7 rounded-full"
                style={{ backgroundColor: hex }}
              />
            </button>
          ))}
        </div>
      </div>

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
          disabled={submitting || !canPurchase}
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
