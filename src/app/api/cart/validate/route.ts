import { createClient } from "@/lib/supabase/server";

type ValidateInputItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

type InvalidReason =
  | "not_found"
  | "coming_soon"
  | "out_of_stock"
  | "inactive"
  | "no_price"
  | "bad_variant";

type InvalidItem = {
  productId: string;
  productName: string;
  reason: InvalidReason;
};

function normalizeItems(input: unknown): ValidateInputItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const r = x as Record<string, unknown>;
      const productId =
        typeof r.productId === "string" ? r.productId.trim() : "";
      const variantId =
        typeof r.variantId === "string" ? r.variantId.trim() : "";
      const quantityRaw =
        typeof r.quantity === "number" ? r.quantity : Number(r.quantity);
      if (!productId || !variantId) return null;
      if (!Number.isFinite(quantityRaw) || quantityRaw < 1) return null;
      return {
        productId,
        variantId,
        quantity: Math.floor(quantityRaw),
      };
    })
    .filter((x): x is ValidateInputItem => x !== null)
    .slice(0, 100);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const items = normalizeItems((payload as { items?: unknown } | null)?.items ?? []);
  if (items.length === 0) {
    return Response.json({ ok: true, invalid: [] satisfies InvalidItem[] });
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const variantIds = [...new Set(items.map((i) => i.variantId))];

  const supabase = await createClient();
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id,name,is_active,availability,price")
    .in("id", productIds);

  const { data: variants, error: vErr } = await supabase
    .from("product_variants")
    .select("id,product_id,label")
    .in("id", variantIds);

  if (pErr || !products || vErr || !variants) {
    return Response.json({ ok: false, reason: "query_failed" }, { status: 500 });
  }

  const pmap = new Map(products.map((p) => [p.id, p]));
  const vmap = new Map(variants.map((v) => [v.id, v]));
  const invalid: InvalidItem[] = [];

  for (const item of items) {
    const p = pmap.get(item.productId);
    const v = vmap.get(item.variantId);
    if (!p) {
      invalid.push({
        productId: item.productId,
        productName: item.productId,
        reason: "not_found",
      });
      continue;
    }
    if (!v || v.product_id !== item.productId) {
      invalid.push({
        productId: p.id,
        productName: p.name,
        reason: "bad_variant",
      });
      continue;
    }
    if (!p.is_active) {
      invalid.push({ productId: p.id, productName: p.name, reason: "inactive" });
      continue;
    }
    if (p.availability === "coming_soon") {
      invalid.push({
        productId: p.id,
        productName: p.name,
        reason: "coming_soon",
      });
      continue;
    }
    if (p.availability === "out_of_stock") {
      invalid.push({
        productId: p.id,
        productName: p.name,
        reason: "out_of_stock",
      });
      continue;
    }
    if (p.price == null) {
      invalid.push({ productId: p.id, productName: p.name, reason: "no_price" });
    }
  }

  return Response.json({ ok: true, invalid });
}
