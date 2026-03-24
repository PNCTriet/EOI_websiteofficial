import { createClient } from "@/lib/supabase/server";

type ValidateInputItem = {
  productId: string;
  quantity: number;
};

type InvalidReason =
  | "not_found"
  | "coming_soon"
  | "out_of_stock"
  | "inactive"
  | "no_price";

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
      const quantityRaw =
        typeof r.quantity === "number" ? r.quantity : Number(r.quantity);
      if (!productId) return null;
      if (!Number.isFinite(quantityRaw) || quantityRaw < 1) return null;
      return { productId, quantity: Math.floor(quantityRaw) };
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

  const ids = [...new Set(items.map((i) => i.productId))];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,is_active,availability,price")
    .in("id", ids);

  if (error || !data) {
    return Response.json({ ok: false, reason: "products_query_failed" }, { status: 500 });
  }

  const map = new Map(data.map((p) => [p.id, p]));
  const invalid: InvalidItem[] = [];

  for (const item of items) {
    const p = map.get(item.productId);
    if (!p) {
      invalid.push({
        productId: item.productId,
        productName: item.productId,
        reason: "not_found",
      });
      continue;
    }
    if (!p.is_active) {
      invalid.push({ productId: p.id, productName: p.name, reason: "inactive" });
      continue;
    }
    if (p.availability === "coming_soon") {
      invalid.push({ productId: p.id, productName: p.name, reason: "coming_soon" });
      continue;
    }
    if (p.availability === "out_of_stock") {
      invalid.push({ productId: p.id, productName: p.name, reason: "out_of_stock" });
      continue;
    }
    if (p.price == null) {
      invalid.push({ productId: p.id, productName: p.name, reason: "no_price" });
    }
  }

  return Response.json({ ok: true, invalid });
}
