import { createClient } from "@/lib/supabase/server";

type IncomingCartLine = {
  productId: string;
  quantity: number;
  colorIndex?: number;
  colorHex?: string | null;
};

function normalizeLines(input: unknown): IncomingCartLine[] {
  if (!Array.isArray(input)) return [];
  const out: IncomingCartLine[] = [];
  for (const x of input) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const productId = typeof r.productId === "string" ? r.productId.trim() : "";
    const quantityRaw = typeof r.quantity === "number" ? r.quantity : Number(r.quantity);
    const colorIndexRaw =
      typeof r.colorIndex === "number" ? r.colorIndex : Number(r.colorIndex ?? 0);
    const colorHex =
      typeof r.colorHex === "string" && r.colorHex.trim() ? r.colorHex.trim() : null;
    if (!productId) continue;
    if (!Number.isFinite(quantityRaw) || quantityRaw < 1) continue;
    out.push({
      productId,
      quantity: Math.min(99, Math.floor(quantityRaw)),
      colorIndex:
        Number.isFinite(colorIndexRaw) && colorIndexRaw >= 0
          ? Math.floor(colorIndexRaw)
          : 0,
      colorHex,
    });
    if (out.length >= 100) break;
  }
  return out;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ synced: false, reason: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ synced: false, reason: "invalid_json" }, { status: 400 });
  }

  const lines = normalizeLines(
    (payload as { items?: unknown } | null)?.items ?? []
  );

  const { data: cart, error: cartErr } = await supabase
    .from("carts")
    .upsert(
      {
        user_id: user.id,
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (cartErr || !cart) {
    return Response.json({ synced: false, reason: "cart_upsert_failed" }, { status: 500 });
  }

  const { error: delErr } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id);
  if (delErr) {
    return Response.json({ synced: false, reason: "cart_clear_failed" }, { status: 500 });
  }

  if (lines.length > 0) {
    const rows = lines.map((line) => ({
      cart_id: cart.id,
      product_id: line.productId,
      quantity: line.quantity,
      color_index: line.colorIndex ?? 0,
      color_hex: line.colorHex ?? null,
    }));
    const { error: insErr } = await supabase.from("cart_items").insert(rows);
    if (insErr) {
      return Response.json(
        { synced: false, reason: "cart_items_insert_failed" },
        { status: 500 }
      );
    }
  }

  return Response.json({ synced: true, items: lines.length });
}
