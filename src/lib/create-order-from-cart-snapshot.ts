import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export type CartSnapshotRow = Record<string, unknown>;

/** Tổng tiền từ snapshot (giá đã fix lúc tạo đơn). */
export function totalFromCartSnapshot(snapshot: unknown): number {
  if (!Array.isArray(snapshot)) return 0;
  return snapshot.reduce((sum, row) => {
    if (!row || typeof row !== "object") return sum;
    const r = row as CartSnapshotRow;
    const q = Number(r.quantity ?? 0);
    const p = Number(r.price ?? 0);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return sum;
    return sum + Math.max(0, Math.floor(q)) * Math.max(0, Math.floor(p));
  }, 0);
}

type OrderItemInsert = {
  order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  product_name_snapshot: string | null;
  variant_label_snapshot: string | null;
  variant_image_snapshot: string | null;
};

/**
 * Tạo dòng order_items từ cart_snapshot — đơn giá lấy từ snapshot (fallback giá SP hiện tại).
 */
export async function insertOrderItemsFromSnapshot(
  admin: AdminClient,
  orderId: string,
  snapshot: unknown
): Promise<{ ok: boolean; error?: string }> {
  const rows = Array.isArray(snapshot) ? snapshot : [];
  const productIds: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as CartSnapshotRow;
    const pid = typeof r.productId === "string" ? r.productId : null;
    if (pid) productIds.push(pid);
  }
  const uniqueIds = [...new Set(productIds)];
  const productMap =
    uniqueIds.length > 0
      ? new Map(
          (
            (
              await admin
                .from("products")
                .select("id,name,price")
                .in("id", uniqueIds)
            ).data ?? []
          ).map((p) => [p.id, p])
        )
      : new Map<string, { id: string; name: string; price: number | null }>();

  const orderItems: OrderItemInsert[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const data = row as CartSnapshotRow;
    const productId = typeof data.productId === "string" ? data.productId : null;
    const variantId = typeof data.variantId === "string" ? data.variantId : null;
    const variantLabel =
      typeof data.variantLabel === "string" ? data.variantLabel.trim() : "";
    const variantImageUrl =
      typeof data.variantImageUrl === "string" ? data.variantImageUrl.trim() : "";
    const quantity =
      typeof data.quantity === "number" ? data.quantity : Number(data.quantity);
    if (!productId || !variantId || !Number.isFinite(quantity) || quantity <= 0) continue;
    const prod = productMap.get(productId);
    if (!prod || prod.price == null) continue;
    const fromSnapshotPrice =
      typeof data.price === "number" && Number.isFinite(data.price) ? data.price : null;
    const fromSnapshotName = typeof data.name === "string" ? data.name : null;
    const displayName = fromSnapshotName ?? prod.name;
    const label = variantLabel || "—";
    orderItems.push({
      order_id: orderId,
      product_id: productId,
      variant_id: variantId,
      quantity: Math.floor(quantity),
      unit_price: fromSnapshotPrice ?? prod.price,
      product_name_snapshot: displayName,
      variant_label_snapshot: label,
      variant_image_snapshot: variantImageUrl || null,
    });
  }

  if (orderItems.length === 0) {
    return { ok: false, error: "no_line_items" };
  }

  const { error } = await admin.from("order_items").insert(orderItems);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function insertInitialStageLog(
  admin: AdminClient,
  orderId: string,
  toStage: Database["public"]["Enums"]["order_stage"]
): Promise<void> {
  await admin.from("order_stage_logs").insert({
    order_id: orderId,
    from_stage: null,
    to_stage: toStage,
  });
}

/** shipping_addr + note lưu Json */
export type CreateDirectOrderParams = {
  userId: string;
  totalAmount: number;
  sepayRef: string | null;
  shippingAddr: Json;
  note: string | null;
  paymentMethod: "cod" | "pay_later";
  hiddenFromAccountList: boolean;
  linkAccessToken: string | null;
  initialStage: "processing" | "paid";
  paidAt: string | null;
};

export async function createOrderDirectFromSnapshot(
  admin: AdminClient,
  params: CreateDirectOrderParams,
  cartSnapshot: unknown
): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: params.userId,
      total_amount: params.totalAmount,
      stage: params.initialStage,
      paid_at: params.paidAt,
      sepay_ref: params.sepayRef,
      shipping_addr: params.shippingAddr,
      note: params.note,
      payment_method: params.paymentMethod,
      hidden_from_account_list: params.hiddenFromAccountList,
      link_access_token: params.linkAccessToken,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message ?? "order_insert" };
  }

  const itemsRes = await insertOrderItemsFromSnapshot(admin, order.id, cartSnapshot);
  if (!itemsRes.ok) {
    await admin.from("orders").delete().eq("id", order.id);
    return { ok: false, error: itemsRes.error ?? "items" };
  }

  await insertInitialStageLog(admin, order.id, params.initialStage);
  return { ok: true, orderId: order.id };
}
