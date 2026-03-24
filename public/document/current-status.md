# EOI - Current Status

Cap nhat: 2026-03-05

Tai lieu nay tom tat nhanh cac thay doi da hoan thanh va trang thai he thong hien tai.
Muc tieu: giup theo doi de khong bi "mat nhip" khi update lien tuc.

---

## 1) Product management (Admin + Store)

### Da xong
- Form tao/sua san pham da ho tro:
  - category (preset + custom)
  - material
  - badge
  - colors (them/xoa/sua)
  - estimate giao hang (delivery_days_min/max)
  - availability: in_stock / coming_soon / out_of_stock
- coming_soon cho phep de trong gia (`price = null`).
- Out_of_stock / coming_soon duoc hien thi tag tren store list + detail.
- Chan add-to-cart voi san pham coming_soon/out_of_stock.
- Description editor da ho tro chen video YouTube/Vimeo.
- Co the xoa anh hien co ngay trong trang edit san pham.

### DB/Migration lien quan
- `20250324120000_product_category_delivery.sql`
- `20250306140000_product_availability.sql`

---

## 2) Branding + Assets

### Da xong
- Chuyen cac vi tri logo/icon sang asset trong `public/image/logo/`.
- Metadata da dung favicon/apple-touch/og-image theo bo logo moi.

---

## 3) Performance improvements (da lam)

- Doi mot so anh san pham tu `img` sang `next/image`.
- Them cau hinh `remotePatterns` cho Supabase storage.
- Giam payload query (tranh `select("*")` o cac cho quan trong).

---

## 4) Security / RLS (Phase 1)

### Da xong trong code
- Them helper `is_admin()` trong DB.
- Siat policy cho:
  - `products`
  - `orders` (user chi doc own order theo `user_id`)
  - `order_items`
  - `order_stage_logs`
  - `customers`
  - `sepay_logs`
- Siat storage policy bucket `product-images`:
  - chi admin moi upload/update/delete
  - chi `image/*`
  - max 5MB
- Frontend admin upload da validate mime type + size.

### DB/Migration lien quan
- `20250306143000_phase1_security_hardening.sql`

---

## 5) Cart persistence (Phase 1)

### Da xong trong code
- Tao server cart:
  - table `carts`
  - table `cart_items`
- Co API sync local cart -> server cart khi user login:
  - `POST /api/cart/sync`
- Co API validate cart item status:
  - `POST /api/cart/validate`
- Cart page canh bao item invalid va disable checkout neu cart khong hop le.

### DB/Migration lien quan
- `20250306150000_phase1_cart_server_sync.sql`

---

## 6) Viec can lam ngay de dong bo production

Can apply day du migration len Supabase:
1. `20250306143000_phase1_security_hardening.sql`
2. `20250306150000_phase1_cart_server_sync.sql`
3. `20250306170000_phase2_auth_foundation.sql`
4. `20250306190000_phase3_checkout_foundation.sql`

Neu chua apply, mot so feature moi se loi do schema/policy chua cap nhat.

---

## 7) Auth progress (Phase 2)

### Da xong trong code
- Tach login thanh 2 luong:
  - `/admin/login` cho admin (email/password)
  - `/login` cho storefront (Google/Facebook OAuth)
- Them callback OAuth: `/auth/callback`.
- Cap nhat middleware:
  - Protect `/account/*`, `/checkout/*` neu chua login.
  - Protect `/admin/*` theo admin role.
- Them nen tang DB auth:
  - table `user_profiles`
  - trigger tao profile khi user dang ky lan dau
- Da co trang account:
  - `/account` xem + cap nhat profile co ban
  - `/account/orders` lich su don
  - `/account/orders/[id]` chi tiet don theo ownership (`user_id`)
- Header storefront hien login button khi guest va avatar initial khi da login.
- Da them nut sign out trong khu vuc `/account`.
- VI/EN da duoc gioi han: chi hien o header trang chu (khong hien "tum lum" o cac trang khac).

### Trang thai
- Phase 2 da hoan tat (bao gom provider Google/Facebook da cau hinh xong).

---

## 8) Next phase (uu tien)

## 8) Checkout progress (Phase 3.1)

### Da xong trong code
- Da tao migration nen cho checkout:
  - them `orders.expires_at`
  - them `orders.payment_method`
  - them `orders.shipping_addr`
  - them `orders.note`
- Da tao utility:
  - `generateSepayRef()`
  - service-role client cho luong tao order
- Da tao checkout flow ban dau:
  - `/checkout` page (protected)
  - prefill dia chi tu `user_profiles.default_address`
  - server action tao order + order_items + stage log
  - validate stock/availability/price truoc khi tao order
  - redirect sang `/checkout/pending/[orderId]`
- Cart page da noi nut checkout sang `/checkout`.
- Checkout auto-fill user info:
  - email lay tu auth session
  - ten nguoi nhan prefill tu profile/auth metadata
- Da them goi y dia chi uu tien Viet Nam:
  - endpoint `GET /api/address/suggest`
  - ho tro suggest cho street/district/city trong checkout form
- Da bo sung webhook payment moi:
  - endpoint `POST /api/webhook/payment`
  - verify chu ky `x-payment-signature` (neu set `PAYMENT_WEBHOOK_SECRET`)
  - match noi dung CK theo ma don `EOI-XXXXXX`
- Da nang cap pending payment:
  - hien QR chuyen khoan VPBank
  - hien countdown het han
  - polling status `/api/orders/[id]/status`
  - popup khi thanh toan thanh cong

### Con thieu trong Phase 3 (theo payment.md)
- Da hoan tat:
  - pending page co QR + countdown + polling + redirect
  - webhook payment verify signature + match ma don
  - success/failed pages
  - migration them stage `expired`
  - endpoint auto-expire san sang cho cron scheduler

---

## 9) Next phase (uu tien)

1. Phase 4 - Order management (theo `order.md`).
2. Phase 5 - SEO + Performance.
3. Phase 6 - Stability + Ops.

---

## Quy uoc cap nhat tai lieu (cam ket tu bay gio)

Moi lan co thay doi lon, se update song song:
- `public/document/current-status.md` (tom tat hien trang)
- `public/document/todolist.md` (tick dau viec)

Neu thay doi lien quan auth/payment/order, se doi chieu va note them trong file spec tuong ung.
