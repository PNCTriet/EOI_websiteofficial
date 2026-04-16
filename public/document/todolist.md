# EOI — Master Todolist

> Cập nhật lần cuối: 2026-03
> Spec chi tiết: [AUTH.md](./AUTH.md) · [PAYMENT.md](./PAYMENT.md) · [ORDER.md](./ORDER.md)

---

## Đã hoàn thành

- [x] Hệ thống logo (`public/image/logo/` — logo, favicon, apple-touch, og-image)
- [x] Metadata layout dùng icon/OG image mới
- [x] Quản lý category trong form sản phẩm (preset + custom)
- [x] Trường material, badge, colors trong admin — lưu đầy đủ vào DB
- [x] Estimate giao hàng theo sản phẩm (`delivery_days_min`, `delivery_days_max`)
- [x] Hiển thị estimate giao hàng động trên storefront
- [x] Trạng thái sản phẩm: `in_stock` / `coming_soon` / `out_of_stock`
- [x] Cho phép `price` null khi `coming_soon` (migration + validate admin + render storefront)
- [x] Tag "Coming soon" / "Out of stock" trên listing và detail
- [x] Chặn add-to-cart khi sản phẩm chưa mở bán hoặc hết hàng
- [x] Xoá ảnh hiện có trong form edit sản phẩm
- [x] Hỗ trợ chèn video (YouTube/Vimeo) trong description
- [x] Sanitize iframe an toàn (whitelist host) + style responsive video
- [x] Chuyển `img` → `next/image` + `remotePatterns` Supabase storage
- [x] Giảm payload query (`select` cột cần thiết thay vì `*`)

---

## Phase 1 — Nền móng bảo mật (làm trước khi live)

### 1.1 RLS & Security
- [x] Rà soát toàn bộ RLS policy: `products`, `orders`, `order_items`, `customers`, `sepay_logs`
- [x] User chỉ đọc được orders của chính mình (policy `auth.uid() = user_id`)
- [x] Giới hạn upload file: ảnh tối đa 5MB, chỉ accept `image/*`; video reject (chỉ dùng embed URL)
- [x] Thêm Supabase Storage policy cho bucket `product-images`

### 1.2 Cart persistence
- [x] Quyết định strategy: localStorage (MVP) — sync lên server sau khi login
- [x] Khi user login, merge cart localStorage vào server cart (bảng `carts`)
- [x] Xử lý edge case: sản phẩm trong cart bị out_of_stock / coming_soon khi checkout

---

## Phase 2 — Auth (xem chi tiết AUTH.md)

- [x] Cài đặt Supabase Auth: Google OAuth + Facebook OAuth (dashboard providers)
- [x] Callback route `/auth/callback` xử lý code exchange
- [x] Middleware bổ sung: tách `admin` role vs `user` session
- [x] Bảng `user_profiles` — lưu thông tin bổ sung (tên, phone, địa chỉ mặc định)
- [x] Trang `/account` — xem profile, cập nhật thông tin
- [x] Trang `/account/orders` — lịch sử đơn hàng của user
- [x] Trang `/account/orders/[id]` — chi tiết + trạng thái đơn
- [x] Bảo vệ route checkout: redirect `/login?next=/checkout` nếu chưa auth
- [x] Storefront header: hiển thị avatar + tên user khi đã login, nút Login khi chưa
- [x] Trang `/login` storefront (khác trang login admin): social login buttons

---

## Phase 3 — Checkout + Payment (xem chi tiết PAYMENT.md)

### 3.1 Checkout flow
- [x] Trang `/checkout` — bảo vệ bằng auth
- [x] Step 1: Xem lại giỏ hàng (items, qty, giá, subtotal)
- [x] Step 2: Thông tin giao hàng (prefill từ `user_profiles`, cho phép sửa)
- [x] Step 3: Xác nhận đơn + chọn phương thức thanh toán
- [x] Server action tạo order: validate stock, tính tổng, tạo `orders` + `order_items` trong transaction
- [x] Block checkout nếu có sản phẩm `coming_soon` hoặc `out_of_stock`
- [x] Sinh `sepay_ref` dạng `EOI-XXXXXX` unique cho mỗi đơn

### 3.2 Payment
- [x] Tích hợp SePay: hiển thị QR + thông tin chuyển khoản sau khi tạo order
- [x] Trang `/checkout/pending/[orderId]` — polling trạng thái, auto redirect khi paid
- [x] Webhook payment endpoint nhận callback + verify chữ ký + match code đơn trong nội dung CK
- [x] Thêm `expired` vào `order_stage` enum (migration)
- [x] Cron job hoặc Edge Function: endpoint auto-expire order quá hạn đã sẵn sàng để schedule
- [x] Trang `/checkout/success/[orderId]` — xác nhận thành công, link về `/account/orders`
- [x] Trang `/checkout/failed` — thất bại / hết hạn, cho phép tạo lại đơn

---

## Phase 4 — Order Management (xem chi tiết ORDER.md)

### 4.1 Admin
- [x] Timeline xử lý đơn đúng nghiệp vụ: `paid` → `processing` → `printing` → `shipped` → `delivered`
- [x] Validate chuyển stage hợp lệ (không được nhảy cóc) — API `POST /api/admin/orders/[id]/stage`
- [x] Trường `tracking_number` + `shipping_carrier` khi chuyển sang `shipped` (migration + form admin)
- [x] Filter + search orders theo stage, ngày, tên khách, sepay_ref
- [x] Export đơn hàng ra CSV (admin) — `GET /api/admin/orders/export`

### 4.2 User
- [x] `/account/orders` — danh sách đơn với stage badge, ngày tạo, tổng tiền
- [x] `/account/orders/[id]` — chi tiết đơn: items, địa chỉ, lịch sử stage, tracking number
- [x] Trang public `/track` — tra đơn không cần login (nhập ref + email; RPC `track_order_by_ref_email`)

### 4.3 Thông báo
- [x] Email xác nhận đặt hàng (sau khi tạo order thành công)
- [x] Email xác nhận thanh toán (sau khi webhook paid)
- [x] Email thông báo đang giao (`shipped` + tracking number)

---

## Phase 5 — SEO + Performance

- [x] JSON-LD `Product` structured data cho `/products/[id]`
- [x] `sitemap.xml` động — include tất cả sản phẩm active
- [x] `robots.txt` — block `/admin`, `/checkout`, `/account`
- [x] Cache danh sách sản phẩm (Next.js `unstable_cache` hoặc ISR)
- [x] Thumbnail strategy: resize ảnh khi upload, lưu thêm `image_thumb_urls`
- [x] Đánh giá region: Vercel `ap-southeast-1` (Singapore) + Supabase cùng region (xem `public/document/ops.md`)
- [x] Web Vitals monitoring (self-hosted: log CLS/LCP/TTFB/FCP/INP)

---

## Phase 6 — Stability + Ops

- [x] Error boundary cho các luồng quan trọng (checkout, payment, order update)
- [x] Logging có cấu trúc cho webhook + payment events
- [x] Rate limiting cho `/api/webhook/sepay` và auth endpoints
- [x] Backup strategy cho Supabase DB
- [x] Staging environment tách biệt production

---

## Ghi chú

- Migration mới phải apply trên Supabase production trước khi release
- Thứ tự ưu tiên: **Phase 1** → **Phase 2 (Auth)** → **Phase 3 (Payment)** → **Phase 4 (Order)**
- Phase 2 và 3 phụ thuộc lẫn nhau — hoàn thành Auth trước khi build Checkout
- [x] Checkout flow da doi sang `payment_intents`: chi tao `orders` khi webhook payment xac nhan thanh toan thanh cong
- [x] Da bo sung progress timeline o trang chi tiet don `/account/orders/[id]`

---

## Đợt mở rộng mới (POS + Campaign + Finance + Labels) — 2026-04

- [x] Tạo migration mở rộng schema: `orders.source`, `orders.staff_id`, `orders.campaign_id`
- [x] Bổ sung role `staff` cho `user_profiles` + helper SQL `is_staff_or_admin()`
- [x] Tạo bảng: `pos_sessions`, `campaigns`, `material_purchases`, `equipment_assets`, `operational_costs`, `labels`, `order_labels`
- [x] Thiết lập index + RLS policies cho toàn bộ bảng mới (admin/staff phù hợp)
- [x] API Labels:
  - [x] `GET/POST /api/admin/labels`
  - [x] `DELETE /api/admin/labels/[id]`
  - [x] `GET/POST /api/admin/orders/[id]/labels`
  - [x] `DELETE /api/admin/orders/[id]/labels/[label_id]`
- [x] API Campaign:
  - [x] `GET/POST /api/admin/campaigns`
  - [x] `PATCH /api/admin/campaigns/[id]`
- [x] API Finance:
  - [x] `POST /api/admin/campaigns/[id]/material-purchases`
  - [x] `POST /api/admin/campaigns/[id]/operational-costs`
  - [x] `POST /api/admin/equipment-assets`
  - [x] `GET /api/admin/finance/pnl`
- [x] API POS:
  - [x] `GET /api/pos/products`
  - [x] `POST /api/pos/orders`
- [x] Middleware:
  - [x] `/pos/*` cho phép `admin` + `staff`
  - [x] `/admin/*` giữ admin-only
- [x] Frontend page mới:
  - [x] `/pos`
  - [x] `/admin/campaigns`
  - [x] `/admin/finance`
  - [x] `/admin/labels`
- [x] Orders UI:
  - [x] Cột labels inline trong `/admin/orders`
  - [x] Add/remove label nhanh tại bảng đơn
- [x] Bổ sung menu mới trên admin sidebar: Campaigns, Finance, Labels, POS
- [x] Chuẩn hóa i18n VI/EN cho toàn bộ màn mới theo `public/document/rule.md`
- [x] POS QR flow: hiển thị popup giữa màn hình + countdown + polling trạng thái; khi thanh toán thành công hiển thị notify và webhook SePay gửi email xác nhận như checkout thường