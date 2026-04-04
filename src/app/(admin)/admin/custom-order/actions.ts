"use server";

import { createClient } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { generateLinkAccessToken } from "@/lib/link-access-token";
import { primaryImageForVariant } from "@/lib/product-variant-images";
import { getCheckoutLinkOrigin } from "@/lib/site-url";
import type { ProductRow, ProductVariantRow } from "@/types/database";

type LineIn = { productId: string; variantId: string; quantity: number };

async function generateUniqueCustomToken(): Promise<string> {
  const admin = createServiceClient();
  for (let i = 0; i < 6; i += 1) {
    const token = generateLinkAccessToken();
    const { data } = await admin
      .from("custom_checkout_links")
      .select("id")
      .eq("token", token)
      .maybeSingle();
    if (!data) return token;
  }
  throw new Error("Cannot generate unique token");
}

export async function createCustomCheckoutLink(formData: FormData): Promise<{
  ok: boolean;
  message?: string;
  checkoutUrl?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUserAdmin(user)) {
    return { ok: false, message: "Forbidden" };
  }

  const hideFromList = String(formData.get("hide_from_list") ?? "") === "true";
  const note = String(formData.get("note") ?? "").trim();
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const ward = String(formData.get("ward") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const paymentModeRaw = String(formData.get("payment_mode") ?? "bank_transfer").trim();
  const payment_mode =
    paymentModeRaw === "cod" || paymentModeRaw === "pay_later"
      ? paymentModeRaw
      : "bank_transfer";
  const linesRaw = String(formData.get("lines_json") ?? "");

  if (!recipientName || !phone || !street || !ward || !district || !province) {
    return { ok: false, message: "address_incomplete" };
  }

  let lines: LineIn[];
  try {
    const parsed = JSON.parse(linesRaw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
    lines = parsed
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const r = x as Record<string, unknown>;
        const productId = typeof r.productId === "string" ? r.productId.trim() : "";
        const variantId = typeof r.variantId === "string" ? r.variantId.trim() : "";
        const quantity = Number(r.quantity);
        if (!productId || !variantId || !Number.isFinite(quantity) || quantity < 1) return null;
        return { productId, variantId, quantity: Math.floor(quantity) };
      })
      .filter((x): x is LineIn => x !== null);
    if (lines.length === 0) throw new Error();
  } catch {
    return { ok: false, message: "lines_invalid" };
  }

  const admin = createServiceClient();
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const variantIds = [...new Set(lines.map((l) => l.variantId))];

  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id,name,price,availability,is_active,image_urls,image_thumb_urls,colors")
    .in("id", productIds);
  if (prodErr || !products?.length) {
    return { ok: false, message: "products_load_failed" };
  }
  const pmap = new Map(products.map((p) => [p.id, p as ProductRow]));

  const { data: variants, error: varErr } = await admin
    .from("product_variants")
    .select("id,product_id,label,image_urls,image_thumb_urls,color_hex")
    .in("id", variantIds);
  if (varErr || !variants?.length) {
    return { ok: false, message: "variants_load_failed" };
  }
  const vmap = new Map(variants.map((v) => [v.id, v as ProductVariantRow]));

  const normalized: Array<{
    productId: string;
    variantId: string;
    variantLabel: string;
    variantImageUrl: string | null;
    quantity: number;
    price: number;
    name: string;
  }> = [];

  for (const line of lines) {
    const p = pmap.get(line.productId);
    const v = vmap.get(line.variantId);
    if (!p || !v || v.product_id !== line.productId) {
      return { ok: false, message: "line_mismatch" };
    }
    if (p.price == null || p.price < 0) {
      return { ok: false, message: "price_invalid" };
    }
    normalized.push({
      productId: line.productId,
      variantId: line.variantId,
      variantLabel: v.label,
      variantImageUrl: primaryImageForVariant(p, v),
      quantity: line.quantity,
      price: p.price,
      name: p.name,
    });
  }

  const cart_snapshot = normalized.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    variantLabel: line.variantLabel,
    variantImageUrl: line.variantImageUrl,
    quantity: line.quantity,
    price: line.price,
    name: line.name,
  }));

  const shippingAddr = {
    recipient_name: recipientName,
    email,
    phone,
    street,
    ward,
    district,
    province,
  };

  const token = await generateUniqueCustomToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const creatorEmail =
    typeof user.email === "string" ? user.email.trim() : "";

  const { error: linkErr } = await admin
    .from("custom_checkout_links")
    .insert({
      token,
      cart_snapshot,
      shipping_addr: shippingAddr,
      note: note || null,
      hide_from_account_list: hideFromList,
      created_by: user.id,
      expires_at: expiresAt,
      payment_mode,
      creator_email: creatorEmail || null,
      customer_email: email || null,
    })
    .select("id")
    .single();
  if (linkErr) {
    return { ok: false, message: linkErr.message ?? "link_create_failed" };
  }

  const origin = getCheckoutLinkOrigin();
  const checkoutUrl = `${origin}/checkout/custom/${token}`;

  return { ok: true, checkoutUrl };
}
