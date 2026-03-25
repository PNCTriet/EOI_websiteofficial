import type { Json } from "@/types/database";
import { parseShippingAddr } from "@/lib/order-shipping";

export function orderCustomerDisplayName(
  shippingAddr: Json | null | undefined,
  customerName: string | null | undefined,
  profileFullName: string | null | undefined
): string {
  const addr = parseShippingAddr(shippingAddr ?? null);
  const n =
    addr?.recipient_name?.trim() ||
    customerName?.trim() ||
    profileFullName?.trim();
  return n || "";
}
