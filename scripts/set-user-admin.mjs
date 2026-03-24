/**
 * Gán app_metadata.role = "admin" cho user (Supabase Admin API).
 * Gộp với app_metadata sẵn có (provider, providers, …) — không ghi đè.
 *
 * User mặc định dự án (trước khi có role):
 *   id:    67cf610c-9a69-4177-ba81-86f6675ad3ea
 *   email: triet.pnc@gmail.com
 *   raw_app_meta_data: { provider: "email", providers: ["email"] }
 *   raw_user_meta_data: { email_verified: true }
 *
 * Biến môi trường:
 *   SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_USER_ID (tuỳ chọn, mặc định UUID ở trên)
 *
 * Chạy:
 *   node scripts/set-user-admin.mjs
 *   (sau khi export biến hoặc dùng env từ .env.local)
 */

import { createClient } from "@supabase/supabase-js";

const USER_ID = process.env.ADMIN_USER_ID ?? "67cf610c-9a69-4177-ba81-86f6675ad3ea";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data: existing, error: getErr } =
    await supabase.auth.admin.getUserById(USER_ID);

  if (getErr) {
    console.error("Error fetching user:", getErr.message);
    process.exit(1);
  }

  const app_metadata = {
    ...(existing.user.app_metadata ?? {}),
    role: "admin",
  };

  const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
    app_metadata,
  });

  if (error) {
    console.error("Error updating user:", error.message);
    process.exit(1);
  }

  console.log("Success. User updated:", {
    id: data.user.id,
    email: data.user.email,
    app_metadata: data.user.app_metadata,
  });
}

main();
