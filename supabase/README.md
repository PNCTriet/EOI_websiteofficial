# Supabase schema (khớp `src/types/database.ts`)

## Cách chạy SQL trên Supabase (nhanh nhất)

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → project của bạn.
2. **SQL Editor** → **New query**.
3. Mở file `migrations/20250305120000_initial_schema.sql`, copy toàn bộ → dán → **Run**.
4. Tiếp tục với `migrations/20250305120001_storage_product_images.sql` → **Run** (bucket + policy upload ảnh).

Nếu project **đã có** bảng/enum trùng tên, cần xử lý tay (drop hoặc đổi tên) trước khi chạy lại.

## Lỗi "Bucket not found" khi thêm sản phẩm / upload ảnh

1. **Trong project:** chạy `npm run storage:bucket` (tạo bucket `product-images` bằng service role).
2. **Trên Supabase:** SQL Editor → chạy `migrations/20250305120001_storage_product_images.sql` (RLS policy cho `authenticated` upload — có thể chạy lại an toàn).

## Kiểm tra key trong `.env.local`

```bash
npm run verify:supabase
```

- Có **`SUPABASE_SERVICE_ROLE_KEY`**: kiểm tra đủ 6 bảng.
- Chỉ có **anon key**: chỉ kiểm tra `products` (đúng với RLS).

## CLI (tuỳ chọn)

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Cần đã login `supabase login` và link đúng project.
