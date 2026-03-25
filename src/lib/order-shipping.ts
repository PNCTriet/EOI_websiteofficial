import type { Json } from "@/types/database";

export type ShippingAddr = {
  recipient_name?: string;
  email?: string;
  phone?: string;
  street?: string;
  ward?: string;
  district?: string;
  province?: string;
};

export function parseShippingAddr(raw: Json | null | undefined): ShippingAddr | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? o[k] : "");
  return {
    recipient_name: str("recipient_name") || undefined,
    email: str("email") || undefined,
    phone: str("phone") || undefined,
    street: str("street") || undefined,
    ward: str("ward") || undefined,
    district: str("district") || undefined,
    province: str("province") || undefined,
  };
}

export function formatShippingAddrLines(addr: ShippingAddr | null, locale: string): string {
  if (!addr) return "";
  const parts = [addr.street, addr.ward, addr.district, addr.province].filter(Boolean);
  return parts.join(locale.startsWith("vi") ? ", " : ", ");
}
