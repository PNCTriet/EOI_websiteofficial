import type { User } from "@supabase/supabase-js";

/** Admin = role "admin" trong user_metadata hoặc app_metadata (Supabase Dashboard hay đặt ở một trong hai). */
export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.user_metadata?.role === "admin" ||
    user.app_metadata?.role === "admin"
  );
}
