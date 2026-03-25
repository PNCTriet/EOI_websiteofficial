# EOI — Auth Spec

> Phạm vi: Storefront authentication (Google + Facebook OAuth)
> Không liên quan đến admin auth (admin dùng email/password riêng)

---

## Tổng quan

```
User chưa login
    ↓ nhấn "Đăng nhập" hoặc vào /checkout
/login (storefront)
    ↓ chọn Google hoặc Facebook
Supabase OAuth redirect
    ↓ callback
/auth/callback  →  exchange code → session
    ↓
Redirect về trang trước (next param) hoặc /account
```

---

## Database

### Bảng `user_profiles`
Tạo tự động sau khi user đăng ký lần đầu (qua Supabase trigger).

```sql
create table user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  phone           text,
  avatar_url      text,
  default_address jsonb default '{}',
  -- default_address: {
  --   recipient_name: string,
  --   phone: string,
  --   street: string,
  --   ward: string,
  --   district: string,
  --   province: string
  -- }
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table user_profiles enable row level security;

-- User chỉ đọc/sửa profile của chính mình
create policy "user read own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "user update own profile"
  on user_profiles for update
  using (auth.uid() = id);

-- Admin đọc được tất cả
create policy "admin read all profiles"
  on user_profiles for select
  using (auth.jwt() ->> 'role' = 'admin');
```

### Trigger tạo profile tự động
```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

### Cập nhật bảng `orders`
Thêm `user_id` để link order với user đã login:
```sql
alter table orders add column user_id uuid references auth.users(id);

-- User chỉ đọc orders của chính mình
create policy "user read own orders"
  on orders for select
  using (auth.uid() = user_id);
```

---

## Supabase Config

Vào **Supabase Dashboard → Authentication → Providers**:

### Google OAuth
1. Bật Google provider
2. Tạo OAuth app tại Google Cloud Console
3. Authorized redirect URI: `https://<project>.supabase.co/auth/v1/callback`
4. Điền Client ID + Client Secret vào Supabase

### Facebook OAuth
1. Bật Facebook provider
2. Tạo app tại Meta Developer Portal
3. Thêm Facebook Login product
4. Valid OAuth Redirect URIs: `https://<project>.supabase.co/auth/v1/callback`
5. Điền App ID + App Secret vào Supabase

### Site URL & Redirect URLs
```
Site URL: https://eoilinhtinh.com (production) / http://localhost:3000 (dev)
Additional redirect URLs:
  https://eoilinhtinh.com/auth/callback
  http://localhost:3000/auth/callback
```

---

## File cần tạo / sửa

### `src/app/auth/callback/route.ts`
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/account'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

### `src/app/login/page.tsx` (storefront — khác trang login admin)
- Layout: centered, background eoi-bg
- Card trắng với logo eoi
- Heading: "Đăng nhập để mua hàng"
- Sub: "Dùng tài khoản Google hoặc Facebook"
- 2 nút social (Google + Facebook) — full width, pill, border style
- Xử lý `?error=auth_failed` — hiển thị thông báo lỗi
- Xử lý `?next=...` — truyền qua vào OAuth redirect

```typescript
// Gọi OAuth:
const supabase = createClient() // browser client
await supabase.auth.signInWithOAuth({
  provider: 'google', // hoặc 'facebook'
  options: {
    redirectTo: `${window.location.origin}/auth/callback?next=${next}`
  }
})
```

### `src/app/(store)/layout.tsx` — cập nhật header
- Server Component: `const { data: { user } } = await supabase.auth.getUser()`
- Nếu user: hiển thị avatar (ảnh hoặc initials) + tên + dropdown (Đơn hàng / Đăng xuất)
- Nếu chưa login: nút "Đăng nhập" → `/login?next=<current-path>`

### `src/middleware.ts` — cập nhật
```typescript
// Thêm vào matcher và logic:
// /checkout → yêu cầu user session (không phải admin role)
// /account/* → yêu cầu user session
// /login (storefront) → nếu đã login thì redirect /account

const isCheckout = pathname.startsWith('/checkout')
const isAccount = pathname.startsWith('/account')
const isStorefrontLogin = pathname === '/login' && !pathname.startsWith('/admin')

if ((isCheckout || isAccount) && !user) {
  return NextResponse.redirect(
    new URL(`/login?next=${pathname}`, request.url)
  )
}
```

### `src/app/account/layout.tsx`
- Protected layout (middleware đã bảo vệ)
- Sidebar hoặc tab navigation: Profile / Đơn hàng của tôi
- Hiển thị avatar + tên user ở top

### `src/app/account/page.tsx`
Form cập nhật thông tin:
- Họ tên (text)
- Số điện thoại (text)
- Địa chỉ mặc định: tên người nhận, SĐT, đường/số nhà, phường, quận, tỉnh/thành
- Submit: update `user_profiles` qua Supabase client
- Hiển thị avatar từ OAuth (Google/Facebook) — không cho upload thay thế ở MVP

### `src/app/account/orders/page.tsx`
- Fetch: `orders` where `user_id = auth.uid()` order by `created_at desc`
- Hiển thị: mã đơn (sepay_ref), ngày tạo, tổng tiền, stage badge, nút "Xem chi tiết"
- Empty state: "Bạn chưa có đơn hàng nào" + nút "Khám phá sản phẩm"

### `src/app/account/orders/[id]/page.tsx`
- Fetch order với điều kiện `user_id = auth.uid()` (bảo vệ không xem đơn người khác)
- Hiển thị đầy đủ: items, địa chỉ giao hàng, tổng tiền, stage hiện tại
- Timeline stage (order_stage_logs) — visual steps
- Tracking number nếu đã shipped

---

## Checkout info collection

Khi user vào `/checkout`, hệ thống:
1. Prefill thông tin từ `user_profiles.default_address`
2. Cho phép sửa thông tin giao hàng cho đơn này (không tự động lưu lại profile)
3. Checkbox "Lưu địa chỉ này làm mặc định" — nếu tick thì update `user_profiles`

Fields bắt buộc khi checkout:
- Tên người nhận (required)
- Số điện thoại (required, validate format VN)
- Địa chỉ chi tiết: đường/số nhà (required)
- Phường/xã (required)
- Quận/huyện (required)
- Tỉnh/thành phố (required)
- Ghi chú đơn hàng (optional)

---

## Edge cases

| Tình huống | Xử lý |
|---|---|
| User login Google lần đầu | Trigger tạo `user_profiles` tự động |
| User login Facebook sau đó login Google cùng email | Supabase tự link account (enable "Link identity") |
| Token hết hạn giữa chừng | `@supabase/ssr` tự refresh — middleware xử lý |
| User xoá account | `on delete cascade` xoá `user_profiles` và policy ẩn orders |
| Admin cố vào `/account` | Không sao — admin cũng là user, có profile bình thường |