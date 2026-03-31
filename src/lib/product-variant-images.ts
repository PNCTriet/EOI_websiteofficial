import type { ProductRow, ProductVariantRow } from "@/types/database";

/** Ảnh gallery: ưu tiên ảnh riêng của biến thể, không có thì dùng ảnh sản phẩm. */
export function galleryForVariant(
  product: Pick<ProductRow, "image_urls" | "image_thumb_urls">,
  variant: Pick<ProductVariantRow, "image_urls" | "image_thumb_urls"> | null,
): { urls: string[]; thumbs: string[] } {
  const vUrls = variant?.image_urls?.filter(Boolean) ?? [];
  if (vUrls.length > 0) {
    const vThumbs = variant?.image_thumb_urls?.filter(Boolean) ?? [];
    return {
      urls: vUrls,
      thumbs: vThumbs.length >= vUrls.length ? vThumbs : vUrls,
    };
  }
  const pu = product.image_urls?.filter(Boolean) ?? [];
  const pt = product.image_thumb_urls?.filter(Boolean) ?? [];
  return { urls: pu, thumbs: pt.length >= pu.length ? pt : pu };
}

/** Một URL đại diện cho giỏ / thumbnail dòng đơn. */
export function primaryImageForVariant(
  product: Pick<ProductRow, "image_urls" | "image_thumb_urls">,
  variant: Pick<ProductVariantRow, "image_urls" | "image_thumb_urls"> | null,
): string | null {
  const { urls, thumbs } = galleryForVariant(product, variant);
  return thumbs[0] ?? urls[0] ?? null;
}
