/**
 * Kiểm tra .env.local có khớp Supabase không (URL + key).
 * Với SUPABASE_SERVICE_ROLE_KEY: kiểm tra tất cả bảng khớp database.ts.
 * Chỉ có ANON: chỉ kiểm tra đọc `products` (RLS).
 *
 * Chạy: npm run verify:supabase
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env.local");

function parseEnvLocal(filePath) {
  if (!existsSync(filePath)) {
    console.error("Không thấy .env.local — copy từ .env.local.example và điền key.");
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !url.startsWith("http")) {
  console.error("Thiếu hoặc sai NEXT_PUBLIC_SUPABASE_URL trong .env.local");
  process.exit(1);
}

const key = serviceKey || anonKey;
if (!key) {
  console.error(
    "Cần ít nhất NEXT_PUBLIC_SUPABASE_ANON_KEY hoặc SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

if (!serviceKey) {
  console.warn(
    "⚠ Chỉ có ANON_KEY: script chỉ test `products` (các bảng khác có RLS không cho anon).\n" +
      "   Thêm SUPABASE_SERVICE_ROLE_KEY để verify đủ 6 bảng.\n"
  );
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const expectedTables = [
  "products",
  "customers",
  "orders",
  "order_items",
  "order_stage_logs",
  "sepay_logs",
];

async function main() {
  console.log("URL:", url);
  console.log("Key:", serviceKey ? "service_role" : "anon\n");

  const tablesToCheck = serviceKey ? expectedTables : ["products"];

  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      console.error(`✗ ${table}:`, error.message);
      if (error.message.includes("does not exist") || error.code === "PGRST205") {
        console.error(
          "\n→ Chạy file SQL trong supabase/migrations/ trên Supabase → SQL Editor."
        );
      }
      process.exit(1);
    }
    console.log(`✓ ${table}`);
  }

  if (!serviceKey) {
    console.log(
      "\n(Gợi ý) Thêm SUPABASE_SERVICE_ROLE_KEY để xác nhận mọi bảng + dùng cho webhook server."
    );
  } else {
    console.log("\nKết nối và schema cơ bản OK.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
