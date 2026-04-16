# EOI Website Official — System Overview

Cap nhat: 2026-04-15

Tai lieu nay mo ta tong quan he thong de dung lam document trung tam cho team (san pham, dev, ops).

---

## 1) Tong quan kien truc

- **Framework**: Next.js App Router (TypeScript, server/client components).
- **Frontend**: Storefront + Admin trong cung mot repo.
- **Backend chinh**: Supabase (Postgres + Auth + RLS + Storage).
- **Payment**: Chuyen khoan ngan hang, webhook doi soat va xac nhan thanh toan.
- **Email**: Resend + Email center noi bo (template/campaign/log).
- **Muc tieu nghiep vu**: Don hang 3D print, theo doi stage, quan ly admin, custom order link.

---

## 2) Module chinh trong ung dung

### Storefront

- Trang san pham: `/`, `/search`, `/products/[id]`.
- Gio hang: `/cart`.
- Checkout:
  - Standard: `/checkout` -> `/checkout/pending/[orderId]` -> `/checkout/success/[orderId]` / `/checkout/failed`.
  - Custom link: `/checkout/custom/[token]` (ho tro bank transfer / COD / pay_later).
- Tai khoan:
  - `/account` (profile + tong hop don/chi tieu).
  - `/account/orders` (danh sach don + pending intents co the thanh toan tiep).
  - `/account/orders/[id]` (chi tiet don + timeline stage).
- Track cong khai: `/track` (tra theo ma don + email, thong tin gioi han).

### Admin

- Dashboard: `/admin`.
- Quan ly san pham: `/admin/products`, `/admin/products/[id]`.
- Quan ly don: `/admin/orders`, `/admin/orders/[id]`.
- Quan ly khach hang: `/admin/customers`.
- Tao don custom: `/admin/custom-order`.
- Email center: `/admin/emails`.

---

## 3) Data model (Supabase/Postgres)

Bang nghiep vu cot loi:

- `products`
- `product_variants`
- `orders`
- `order_items`
- `order_stage_logs`
- `payment_intents`
- `custom_checkout_links`
- `sepay_logs`
- `carts`, `cart_items`
- `customers` (legacy/supporting customer data)
- `user_profiles` (ho so user storefront)

Bang email center:

- `email_templates`
- `email_campaigns`
- `email_logs`

Ghi chu:

- `orders.user_id` la khoa chinh de ownership theo user storefront.
- `orders.stage` la state machine cua don.
- `payment_intents` dung cho luong cho thanh toan (khong tao order som).
- `custom_checkout_links` dung cho don custom va che do an danh sach account (`?access=` token).

---

## 4) Auth va phan quyen

### Auth flows

- **Storefront user**: OAuth Google/Facebook, callback `/auth/callback`.
- **Admin**: `/admin/login` voi role admin (kiem tra qua metadata + DB helper).

### Middleware

- Bao ve `/account/*`, `/checkout/*`: can user login.
- Bao ve `/admin/*`: can admin role.

### RLS

- User chi doc du lieu cua minh (`orders`, `order_items`, `order_stage_logs`, `payment_intents`...).
- Admin co full quyen o bang quan tri.
- Storage `product-images`: admin-only write, kiem soat mime/size.

---

## 5) Payment & order lifecycle

## State machine

`pending_payment -> paid -> processing -> printing -> shipped -> delivered`

Nhanh dong:

- `cancelled`: admin (mot so stage cho phep).
- `expired`: he thong auto-expire intent/order qua han.

### Luong thanh toan standard (bank transfer)

1. Checkout tao `payment_intents` (pending) + `sepay_ref`.
2. Trang pending hien QR + countdown + polling status.
3. Webhook payment (`POST /api/webhook/payment`) doi soat:
   - verify signature (neu co secret),
   - match ref + amount,
   - tao `orders` + `order_items` + `order_stage_logs`,
   - update `payment_intents` -> `paid`,
   - ghi `sepay_logs`.
4. Redirect success khi da paid.

### Luong custom order

- Admin tao link custom.
- Khach mo link:
  - `bank_transfer`: tao payment intent, vao pending QR.
  - `cod` / `pay_later`: tao order truc tiep (khong cho webhook).
- Co che hide from account list va access token de truy cap link rieng.

---

## 6) Email center

Template keys chinh:

- `order_created`
- `order_paid`
- `order_shipped`
- `custom_order_link_ready`
- `marketing_broadcast`

Trigger gui email:

- Sau webhook thanh toan tao order: gui `order_created` + `order_paid`.
- Khi admin chuyen stage sang `shipped`: gui `order_shipped`.
- Khi tao custom link (cod/pay_later): gui `custom_order_link_ready`.

Noi dung email order da ho tro:

- thong tin nguoi nhan,
- dia chi giao,
- tong tien hien thi,
- **danh sach san pham trong mail** (`order_lines_html`).

---

## 7) API routes chinh

### Store/system

- `POST /api/cart/sync`
- `POST /api/cart/validate`
- `GET /api/payment-intents/[id]/status`
- `GET /api/orders/[id]/status`
- `GET|POST /api/orders/expire`
- `POST /api/locale`
- `GET /api/address/suggest`
- `GET /api/stl-proxy`

### Webhooks

- `POST /api/webhook/payment`
- `POST /api/webhook/sepay`
- `POST /api/webhook/resend`

### Admin APIs

- `POST /api/admin/orders/[id]/stage`
- `GET /api/admin/orders/[id]/preview`
- `GET /api/admin/orders/export`
- `GET /api/admin/email/dashboard`
- `GET/PUT /api/admin/email/templates/[key]`
- `GET /api/admin/email/templates`
- `POST /api/admin/email/campaigns/send`

---

## 8) Admin experience hien tai

### Orders

- List view + Kanban view.
- Filter/search/export.
- Quick actions tren list:
  - bam badge stage -> popup chuyen stage tiep theo (co confirm, co input carrier/tracking neu shipped),
  - bam ten khach -> popup thong tin lien he + danh sach san pham/don lien quan.
- Chi tiet order:
  - timeline stage co mau phan biet,
  - cap nhat stage server-side validate transition.

### Customers

- Gom nhom theo email.
- Neu cung email co nhieu ten -> liet ke day du.
- Co bo loc theo cot + search.
- Bam dong -> popup tong hop + don hang lien quan.

### Dashboard

- KPI tong don, pending, printing, doanh thu thang.
- Heatmap doanh thu theo ngay trong thang.
- Ranking san pham theo so luong ban + tong doanh thu.

---

## 9) Store experience hien tai

- Cart server sync + validate.
- Checkout protected, prefill profile/default address.
- Pending payment page co QR + countdown + polling.
- Account page:
  - profile,
  - tong so don + tong chi tieu tinh theo `orders.user_id`,
  - orders list + order detail timeline.

---

## 10) Config/env quan trong

Biến quan trong:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `PAYMENT_WEBHOOK_SECRET` (signature verify webhook payment)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- Bank config cho QR (frontend pending page):
  - `NEXT_PUBLIC_PAYMENT_BANK_CODE`
  - `NEXT_PUBLIC_PAYMENT_ACCOUNT_NO`
  - `NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME`

---

## 11) Logging, monitoring, ops

- Logging event cho webhook/payment flow (`logEvent`).
- `sepay_logs` luu raw payload + matched state.
- `email_logs` luu full sending lifecycle.
- Cron expire (`/api/orders/expire`) de don/intents pending khong treo vo han.
- Co tai lieu ops rieng: `public/document/ops.md`.

---

## 12) Quy uoc cap nhat document

Khi co thay doi lon ve flow:

1. Cap nhat file nay (`overview.md`) o muc lien quan.
2. Cap nhat them file chi tiet:
   - `auth.md` neu doi auth,
   - `payment.md` neu doi flow thanh toan,
   - `order.md` neu doi stage/transition/UI order,
   - `current-status.md` neu thay doi milestone.

Muc tieu: overview luon la "single source of truth" o muc tong quan, con cac file kia la dac ta chi tiet.

