import type { User } from "@supabase/supabase-js";
import { isUserAdmin, isUserAdminOrStaff } from "@/lib/auth-helpers";

export function requireAdmin(user: User | null | undefined): boolean {
  return isUserAdmin(user);
}

export function requireAdminOrStaff(user: User | null | undefined): boolean {
  return isUserAdminOrStaff(user);
}
