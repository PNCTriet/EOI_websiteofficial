import { createServiceClient } from "@/lib/supabase/service";
import { parseShippingAddr } from "@/lib/order-shipping";
import type { Json } from "@/types/database";

/**
 * Gắn đơn chưa có user_id với tài khoản khi:
 * - email trong shipping_addr khớp email đăng nhập, hoặc
 * - đơn gắn link custom có customer_email khớp (trường hợp snapshot thiếu email giao hàng).
 */
export async function claimOrdersMatchingEmail(userId: string, email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;

  const admin = createServiceClient();

  const { data: candidates, error } = await admin
    .from("orders")
    .select("id, shipping_addr, user_id")
    .is("user_id", null);

  if (error || !candidates?.length) {
    /* fall through to link-based claim */
  } else {
    for (const row of candidates) {
      const addr = parseShippingAddr(row.shipping_addr as Json | null);
      const em = addr?.email?.trim().toLowerCase();
      if (em && em === normalized) {
        await admin.from("orders").update({ user_id: userId }).eq("id", row.id);
      }
    }
  }

  const { data: links } = await admin
    .from("custom_checkout_links")
    .select("order_id, customer_email")
    .not("order_id", "is", null);

  for (const link of links ?? []) {
    const ce = link.customer_email?.trim().toLowerCase();
    if (!ce || ce !== normalized) continue;
    const oid = link.order_id as string | null;
    if (!oid) continue;
    const { data: ord } = await admin
      .from("orders")
      .select("user_id")
      .eq("id", oid)
      .maybeSingle();
    if (ord && ord.user_id == null) {
      await admin.from("orders").update({ user_id: userId }).eq("id", oid);
    }
  }
}
