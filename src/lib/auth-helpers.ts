import type { User } from "@supabase/supabase-js";

/**
 * Admin/staff = role trong app_metadata (chỉ service role / Dashboard ghi được).
 * Không tin user_metadata: user tự sửa được qua supabase.auth.updateUser().
 */
function appRole(user: User | null | undefined): unknown {
  return user?.app_metadata?.role;
}

export function isUserAdmin(user: User | null | undefined): boolean {
  return appRole(user) === "admin";
}

export function isUserStaff(user: User | null | undefined): boolean {
  return appRole(user) === "staff";
}

export function isUserAdminOrStaff(user: User | null | undefined): boolean {
  return isUserAdmin(user) || isUserStaff(user);
}
