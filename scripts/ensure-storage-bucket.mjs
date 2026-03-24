/**
 * Tạo bucket Storage `product-images` (public) nếu chưa có — hết lỗi "Bucket not found" khi upload ảnh SP.
 * Dùng SUPABASE_SERVICE_ROLE_KEY từ .env.local.
 *
 * Chạy: npm run storage:bucket
 *
 * Policy RLS cho storage.objects: vẫn cần chạy SQL
 * supabase/migrations/20250305120001_storage_product_images.sql
 * trong SQL Editor (một lần), nếu upload báo lỗi quyền.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const root = resolve(process.cwd());
const envPath = resolve(root, ".env.local");

function parseEnvLocal(filePath) {
  if (!existsSync(filePath)) {
    console.error("Không thấy .env.local");
    process.exit(1);
  }
  const raw = readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = parseEnvLocal(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url?.startsWith("http") || !serviceKey) {
  console.error("Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("listBuckets:", listErr.message);
    process.exit(1);
  }

  const exists = buckets?.some((b) => b.id === BUCKET || b.name === BUCKET);
  if (exists) {
    console.log(`✓ Bucket "${BUCKET}" đã tồn tại.`);
    console.log(
      "  Nếu upload vẫn lỗi, chạy file SQL: supabase/migrations/20250305120001_storage_product_images.sql"
    );
    return;
  }

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });

  if (createErr) {
    console.error("createBucket:", createErr.message);
    process.exit(1);
  }

  console.log(`✓ Đã tạo bucket "${BUCKET}" (public).`);
  console.log(
    "  Bước tiếp: Supabase → SQL Editor → chạy supabase/migrations/20250305120001_storage_product_images.sql (policy upload cho user đã login)."
  );
}

main();
