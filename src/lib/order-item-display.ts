import type { OrderItemRow, ProductRow } from "@/types/database";

export type OrderItemWithVariantJoin = OrderItemRow & {
  products: Pick<ProductRow, "name"> | null;
};

const SEP = " — ";

/** Snapshot / placeholder không coi là mã thật */
export function isPlaceholderVariantLabel(s: string | null | undefined): boolean {
  if (!s?.trim()) return true;
  const t = s.trim();
  return t === "-" || t === "\u2013" || t === "\u2014";
}

/**
 * Từ payment_intents.cart_snapshot (mảng dòng giỏ lúc checkout).
 * Key: `${productId}:${variantId}`; thêm `product:${productId}` khi trong giỏ chỉ có một dòng cho SP đó.
 */
export function buildCartVariantLabelMap(cartSnapshot: unknown): Map<string, string> {
  const m = new Map<string, string>();
  if (!Array.isArray(cartSnapshot)) return m;
  const labelsByProduct = new Map<string, string[]>();
  for (const row of cartSnapshot) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const pid = typeof r.productId === "string" ? r.productId : null;
    const vid = typeof r.variantId === "string" ? r.variantId : null;
    const label = typeof r.variantLabel === "string" ? r.variantLabel.trim() : "";
    if (pid && vid && label && !isPlaceholderVariantLabel(label)) {
      m.set(`${pid}:${vid}`, label);
    }
    if (pid && label && !isPlaceholderVariantLabel(label)) {
      const arr = labelsByProduct.get(pid) ?? [];
      arr.push(label);
      labelsByProduct.set(pid, arr);
    }
  }
  for (const [pid, labels] of labelsByProduct) {
    if (labels.length === 1 && labels[0]) {
      m.set(`product:${pid}`, labels[0]);
    }
  }
  return m;
}

export type VariantLabelResolveOptions = {
  /** product_variants.id → label */
  variantLabelsById?: Map<string, string>;
  /** `${productId}:${variantId}` → label từ cart_snapshot */
  cartLabels?: Map<string, string>;
};

/** Tên SP hiển thị: ưu snapshot; nếu snapshot legacy dạng "Tên — Mã" thì chỉ lấy phần tên. */
export function orderItemDisplayProductName(
  it: OrderItemWithVariantJoin,
  productFallback: string,
): string {
  const snap = it.product_name_snapshot?.trim();
  if (!snap) return it.products?.name?.trim() || productFallback;
  if (snap.includes(SEP)) {
    const head = snap.slice(0, snap.lastIndexOf(SEP)).trim();
    return head || snap;
  }
  return snap;
}

/**
 * Mã / phiên bản: DB variant → snapshot cột → cart checkout → parse tên legacy.
 */
export function orderItemDisplayVariantLabel(
  it: OrderItemWithVariantJoin,
  options?: VariantLabelResolveOptions,
): string | null {
  const { variantLabelsById, cartLabels } = options ?? {};

  if (it.variant_id && variantLabelsById?.size) {
    const fromPv = variantLabelsById.get(it.variant_id)?.trim();
    if (fromPv && !isPlaceholderVariantLabel(fromPv)) return fromPv;
  }

  const snap = it.variant_label_snapshot?.trim();
  if (snap && !isPlaceholderVariantLabel(snap)) return snap;

  if (it.product_id && cartLabels?.size) {
    if (it.variant_id) {
      const fromCart = cartLabels.get(`${it.product_id}:${it.variant_id}`)?.trim();
      if (fromCart && !isPlaceholderVariantLabel(fromCart)) return fromCart;
    }
    const solo = cartLabels.get(`product:${it.product_id}`)?.trim();
    if (solo && !isPlaceholderVariantLabel(solo)) return solo;
  }

  const full = it.product_name_snapshot?.trim();
  if (full?.includes(SEP)) {
    const tail = full.slice(full.lastIndexOf(SEP) + SEP.length).trim();
    if (tail && !isPlaceholderVariantLabel(tail)) return tail;
  }
  return null;
}
