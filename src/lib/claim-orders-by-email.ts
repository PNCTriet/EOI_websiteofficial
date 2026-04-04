import { createServiceClient } from "@/lib/supabase/service";
import { parseShippingAddr } from "@/lib/order-shipping";
import type { Json } from "@/types/database";

/**
 * Gắn đơn chưa có user_id với tài khoản khi email trong shipping khớp email đăng nhập.
 */
export async function claimOrdersMatchingEmail(userId: string, email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;

  const admin = createServiceClient();
  const { data: candidates, error } = await admin
    .from("orders")
    .select("id, shipping_addr, user_id")
    .is("user_id", null);

  if (error || !candidates?.length) return;

  for (const row of candidates) {
    const addr = parseShippingAddr(row.shipping_addr as Json | null);
    const em = addr?.email?.trim().toLowerCase();
    if (em && em === normalized) {
      await admin.from("orders").update({ user_id: userId }).eq("id", row.id);
    }
  }
}
