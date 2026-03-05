#!/usr/bin/env node
/**
 * Tạo link cảm ơn sản phẩm (signed) để ghi vào NFC.
 * Đọc EOI_PRODUCT_LINK_SECRET từ .env.local (hoặc biến môi trường).
 * Chạy: npm run generate-product-link -- <productId> [baseUrl]
 * Ví dụ: npm run generate-product-link -- keymaaux http://localhost:3000
 */
import { createHmac } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local nếu có (để dùng chung secret với Next dev)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*EOI_PRODUCT_LINK_SECRET\s*=\s*(.+?)\s*$/);
    if (m) process.env.EOI_PRODUCT_LINK_SECRET = m[1].replace(/^["']|["']$/g, "").trim();
  }
}

const productId = process.argv[2];
const baseUrl = process.argv[3] || "https://eoilinhtinh.com";
const secret = process.env.EOI_PRODUCT_LINK_SECRET;

if (!productId) {
  console.error("Usage: EOI_PRODUCT_LINK_SECRET=... node scripts/generate-product-link.mjs <productId> [baseUrl]");
  process.exit(1);
}
if (!secret || secret.length < 16) {
  console.error("EOI_PRODUCT_LINK_SECRET must be set and at least 16 characters.");
  process.exit(1);
}

const sig = createHmac("sha256", secret).update(productId).digest("hex");
const url = `${baseUrl.replace(/\/$/, "")}/product/thank-you?p=${encodeURIComponent(productId)}&sig=${sig}`;
console.log(url);
