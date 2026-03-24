"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateSepayRef } from "@/lib/order-ref";
import { createServiceClient } from "@/lib/supabase/service";

type CartInput = {
  productId: string;
  quantity: number;
};

function parseCartItems(raw: FormDataEntryValue | null): CartInput[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const r = x as Record<string, unknown>;
        const productId = typeof r.productId === "string" ? r.productId : "";
        const quantity = Number(r.quantity);
        if (!productId || !Number.isFinite(quantity) || quantity < 1) return null;
        return {
          productId,
          quantity: Math.floor(quantity),
        };
      })
      .filter((x): x is CartInput => x !== null)
      .slice(0, 100);
  } catch {
    return [];
  }
}

async function generateUniqueRef() {
  const admin = createServiceClient();
  for (let i = 0; i < 5; i += 1) {
    const ref = generateSepayRef();
    const { data } = await admin
      .from("orders")
      .select("id")
      .eq("sepay_ref", ref)
      .maybeSingle();
    if (!data) return ref;
  }
  throw new Error("Cannot generate unique order ref");
}

export async function createCheckoutOrder(formData: FormData): Promise<{
  ok: boolean;
  message?: string;
  intentId?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Please sign in" };
  }

  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const ward = String(formData.get("ward") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || user.email || "";
  const saveAddress = String(formData.get("save_address") ?? "") === "true";
  const cartItems = parseCartItems(formData.get("cart_items_json"));

  if (
    !recipientName ||
    !phone ||
    !street ||
    !ward ||
    !district ||
    !province ||
    cartItems.length === 0
  ) {
    return { ok: false, message: "Missing required checkout data" };
  }

  const shippingAddr = {
    recipient_name: recipientName,
    email,
    phone,
    street,
    ward,
    district,
    province,
  };

  const admin = createServiceClient();
  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id,name,price,availability,is_active")
    .in("id", productIds);
  if (prodErr || !products) {
    return { ok: false, message: "Cannot load product data" };
  }
  const map = new Map(products.map((p) => [p.id, p]));

  for (const item of cartItems) {
    const p = map.get(item.productId);
    if (!p) return { ok: false, message: "Product no longer exists" };
    if (!p.is_active) return { ok: false, message: `${p.name} is inactive` };
    if (p.availability === "coming_soon" || p.availability === "out_of_stock") {
      return { ok: false, message: `${p.name} is not available for checkout` };
    }
    if (p.price == null || p.price < 0) {
      return { ok: false, message: `${p.name} has no valid price` };
    }
  }

  const total = cartItems.reduce((sum, item) => {
    const p = map.get(item.productId);
    return sum + ((p?.price ?? 0) * item.quantity);
  }, 0);

  const sepayRef = await generateUniqueRef();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: intent, error: intentErr } = await admin
    .from("payment_intents")
    .insert({
      user_id: user.id,
      sepay_ref: sepayRef,
      amount: total,
      cart_snapshot: cartItems,
      shipping_addr: shippingAddr,
      note: note || null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (intentErr || !intent) {
    return { ok: false, message: "Could not create payment intent" };
  }

  if (saveAddress) {
    await admin
      .from("user_profiles")
      .upsert({ id: user.id, default_address: shippingAddr }, { onConflict: "id" });
  }

  return { ok: true, intentId: intent.id };
}
