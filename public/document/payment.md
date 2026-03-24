# EOI — Payment Spec

> Phương thức: SePay (trung gian nhận webhook chuyển khoản ngân hàng)
> Flow: Tạo order → Hiển thị QR/thông tin CK → Polling/Webhook → Xác nhận

---

## Tổng quan flow

```
User xác nhận đơn hàng
    ↓
Server tạo order (stage: pending_payment)
Sinh sepay_ref = "EOI-" + 6 ký tự random unique
    ↓
Redirect → /checkout/pending/[orderId]
    ↓
Hiển thị:
  • QR code ngân hàng (STK + số tiền + nội dung CK)
  • Nội dung CK bắt buộc: "EOI-XXXXXX"
  • Countdown timer 30 phút
    ↓
Song song:
  [Client] Polling GET /api/orders/[id]/status mỗi 5 giây
  [Server] SePay POST /api/webhook/sepay khi có giao dịch khớp
    ↓
Khi paid:
  → Redirect /checkout/success/[orderId]
Khi hết 30 phút:
  → Auto expire order (Edge Function)
  → Redirect /checkout/failed?reason=expired
```

---

## Database — thay đổi cần migration

### Cập nhật enum `order_stage`
```sql
-- Thêm trạng thái expired vào enum
alter type order_stage add value 'expired' after 'cancelled';
-- Lưu ý: add value không cần recreate enum, nhưng phải commit transaction trước khi dùng
```

### Cập nhật bảng `orders`
```sql
alter table orders
  add column user_id          uuid references auth.users(id),
  add column expires_at       timestamptz,   -- thời điểm order hết hạn (created_at + 30 phút)
  add column payment_method   text default 'bank_transfer',
  add column tracking_number  text,
  add column shipping_carrier text;

-- Index để webhook tìm nhanh theo sepay_ref
create index idx_orders_sepay_ref on orders(sepay_ref);
create index idx_orders_user_id   on orders(user_id);
create index idx_orders_stage     on orders(stage);
```

### Cập nhật RLS `orders`
```sql
-- User đọc orders của chính mình
create policy "user read own orders"
  on orders for select
  using (auth.uid() = user_id);

-- User tạo order (insert) — server action dùng service role nên không cần policy này
-- nhưng giữ lại để rõ ràng intent
create policy "user insert own order"
  on orders for insert
  with check (auth.uid() = user_id);
```

---

## Sinh `sepay_ref`

Yêu cầu:
- Format: `EOI-` + 6 ký tự uppercase alphanumeric (VD: `EOI-A3K9P2`)
- Unique trong bảng orders
- Đủ ngắn để user nhập tay nếu cần
- Không chứa ký tự dễ nhầm (O/0, I/1/L)

```typescript
// src/lib/order-ref.ts
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // bỏ O,I,L,0,1

export function generateSepayRef(): string {
  let ref = 'EOI-'
  for (let i = 0; i < 6; i++) {
    ref += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  }
  return ref
}

// Khi insert order, check unique, retry tối đa 5 lần nếu trùng
export async function generateUniqueRef(supabase): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const ref = generateSepayRef()
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('sepay_ref', ref)
      .single()
    if (!data) return ref
  }
  throw new Error('Cannot generate unique sepay_ref')
}
```

---

## Server Action tạo order

```typescript
// src/app/checkout/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { generateUniqueRef } from '@/lib/order-ref'
import { redirect } from 'next/navigation'

export async function createOrder(formData: FormData) {
  const supabase = await createClient()

  // 1. Verify user đã login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/checkout')

  // 2. Parse form data
  const shippingAddr = {
    recipient_name: formData.get('recipient_name') as string,
    phone:          formData.get('phone') as string,
    street:         formData.get('street') as string,
    ward:           formData.get('ward') as string,
    district:       formData.get('district') as string,
    province:       formData.get('province') as string,
  }
  const note = formData.get('note') as string

  // 3. Lấy cart items từ request (hoặc từ server cart)
  const cartItems = JSON.parse(formData.get('cart_items') as string)
  // cartItems: [{ product_id, quantity }]

  // 4. Dùng service role để bypass RLS trong transaction
  const adminSupabase = createServiceClient()

  // 5. Validate products còn hàng, lấy giá hiện tại
  const productIds = cartItems.map(i => i.product_id)
  const { data: products, error: prodError } = await adminSupabase
    .from('products')
    .select('id, name, price, status, stl_url, images')
    .in('id', productIds)

  if (prodError || !products) throw new Error('Không thể lấy thông tin sản phẩm')

  for (const item of cartItems) {
    const product = products.find(p => p.id === item.product_id)
    if (!product) throw new Error(`Sản phẩm không tồn tại`)
    if (product.status !== 'in_stock') throw new Error(`${product.name} hiện không thể đặt hàng`)
    if (product.price === null) throw new Error(`${product.name} chưa có giá`)
  }

  // 6. Tính tổng tiền
  const totalAmount = cartItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id)!
    return sum + (product.price! * item.quantity)
  }, 0)

  // 7. Sinh sepay_ref unique
  const sepayRef = await generateUniqueRef(adminSupabase)

  // 8. Tạo order
  const { data: order, error: orderError } = await adminSupabase
    .from('orders')
    .insert({
      user_id:       user.id,
      total_amount:  totalAmount,
      stage:         'pending_payment',
      sepay_ref:     sepayRef,
      shipping_addr: shippingAddr,
      note:          note || null,
      expires_at:    new Date(Date.now() + 30 * 60 * 1000).toISOString(), // +30 phút
    })
    .select('id')
    .single()

  if (orderError || !order) throw new Error('Tạo đơn hàng thất bại')

  // 9. Tạo order_items với snapshot
  const orderItems = cartItems.map(item => {
    const product = products.find(p => p.id === item.product_id)!
    return {
      order_id:   order.id,
      product_id: item.product_id,
      quantity:   item.quantity,
      unit_price: product.price!,
      snapshot: {
        name:    product.name,
        price:   product.price,
        stl_url: product.stl_url,
        image:   product.images?.[0] ?? null,
      }
    }
  })

  await adminSupabase.from('order_items').insert(orderItems)

  // 10. Lưu vào order_stage_logs
  await adminSupabase.from('order_stage_logs').insert({
    order_id:   order.id,
    from_stage: null,
    to_stage:   'pending_payment',
  })

  // 11. Optionally: lưu địa chỉ mặc định nếu user chọn
  if (formData.get('save_address') === 'true') {
    await adminSupabase
      .from('user_profiles')
      .update({ default_address: shippingAddr })
      .eq('id', user.id)
  }

  redirect(`/checkout/pending/${order.id}`)
}
```

---

## Trang `/checkout/pending/[orderId]`

```
┌─────────────────────────────────┐
│  Chờ thanh toán                 │
│  ──────────────────────────────  │
│  Đơn hàng: EOI-A3K9P2           │
│  Tổng tiền: 205.000đ            │
│                                  │
│  ┌──────────────────────────┐   │
│  │   [QR CODE NGÂN HÀNG]    │   │
│  └──────────────────────────┘   │
│                                  │
│  Ngân hàng: MB Bank             │
│  Số TK: 1234567890              │
│  Chủ TK: NGUYEN VAN A           │
│  Số tiền: 205.000đ              │
│  Nội dung: EOI-A3K9P2  [Copy]  │
│                                  │
│  ⚠ Nhập đúng nội dung CK!       │
│                                  │
│  Hết hạn sau: 28:45  ⏱         │
│                                  │
│  [Tôi đã chuyển khoản xong]     │
└─────────────────────────────────┘
```

- Client Component, polling `/api/orders/[id]/status` mỗi 5 giây
- Khi status = `paid` → auto redirect `/checkout/success/[orderId]`
- Countdown timer đến `expires_at` — khi hết → redirect `/checkout/failed?reason=expired`
- QR code: dùng thư viện `qrcode.react` hoặc generate server-side

### API Route polling
```typescript
// src/app/api/orders/[id]/status/route.ts
export async function GET(request: Request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: order } = await supabase
    .from('orders')
    .select('id, stage, paid_at')
    .eq('id', params.id)
    .eq('user_id', user.id) // chỉ được query order của mình
    .single()

  if (!order) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ stage: order.stage, paid_at: order.paid_at })
}
```

---

## Webhook SePay — hoàn chỉnh

```typescript
// src/app/api/webhook/sepay/route.ts
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

export async function POST(request: Request) {
  // 1. Verify HMAC signature (nếu SePay hỗ trợ)
  const signature = request.headers.get('x-sepay-signature')
  const rawBody = await request.text()

  if (process.env.SEPAY_WEBHOOK_SECRET && signature) {
    const expected = createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')
    if (signature !== expected) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const body = JSON.parse(rawBody)

  // Dùng service role để bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Log raw payload TRƯỚC — luôn luôn, dù có lỗi gì sau
  const { data: logEntry } = await supabase
    .from('sepay_logs')
    .insert({
      raw_payload: body,
      amount:      body.transferAmount ?? body.amount ?? null,
      matched:     false,
    })
    .select('id')
    .single()

  try {
    // 3. Parse nội dung chuyển khoản
    const content: string = (body.content ?? body.description ?? '').toUpperCase()
    const refMatch = content.match(/EOI-[A-Z0-9]{6}/)
    if (!refMatch) {
      // Không match ref — giao dịch không liên quan, bỏ qua
      return Response.json({ received: true, matched: false })
    }

    const sepayRef = refMatch[0]

    // 4. Tìm order — chỉ match nếu đang pending_payment và chưa expired
    const { data: order } = await supabase
      .from('orders')
      .select('id, total_amount, stage, expires_at')
      .eq('sepay_ref', sepayRef)
      .eq('stage', 'pending_payment')
      .single()

    if (!order) {
      return Response.json({ received: true, matched: false, reason: 'order_not_found' })
    }

    // 5. Check expired
    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      await supabase
        .from('orders')
        .update({ stage: 'expired' })
        .eq('id', order.id)
      return Response.json({ received: true, matched: false, reason: 'order_expired' })
    }

    // 6. Verify amount (cho phép sai lệch ±1000đ — tránh lỗi làm tròn)
    const incoming = Number(body.transferAmount ?? body.amount ?? 0)
    if (Math.abs(incoming - Number(order.total_amount)) > 1000) {
      return Response.json({ received: true, matched: false, reason: 'amount_mismatch' })
    }

    // 7. Idempotency check — không update nếu đã paid
    // (đã handle bằng eq('stage', 'pending_payment') ở trên)

    // 8. Update order → paid (atomic)
    await supabase
      .from('orders')
      .update({ stage: 'paid', paid_at: new Date().toISOString() })
      .eq('id', order.id)

    // 9. Log stage change
    await supabase.from('order_stage_logs').insert({
      order_id:   order.id,
      from_stage: 'pending_payment',
      to_stage:   'paid',
    })

    // 10. Update sepay_log: matched + link order_id
    if (logEntry) {
      await supabase
        .from('sepay_logs')
        .update({ matched: true, order_id: order.id })
        .eq('id', logEntry.id)
    }

    // TODO Phase 4: trigger gửi email xác nhận thanh toán

  } catch (err) {
    console.error('[webhook/sepay] error:', err)
    // Vẫn trả 200 để SePay không retry
  }

  // 11. Luôn trả 200
  return Response.json({ received: true })
}
```

---

## Edge Function — Auto expire orders

Chạy mỗi 5 phút, expire các order quá hạn:

```typescript
// supabase/functions/expire-orders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: expiredOrders } = await supabase
    .from('orders')
    .update({ stage: 'expired' })
    .eq('stage', 'pending_payment')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  // Log stage cho mỗi order expired
  if (expiredOrders?.length) {
    await supabase.from('order_stage_logs').insert(
      expiredOrders.map(o => ({
        order_id:   o.id,
        from_stage: 'pending_payment',
        to_stage:   'expired',
      }))
    )
  }

  return new Response(JSON.stringify({ expired: expiredOrders?.length ?? 0 }))
})
```

Cấu hình cron trong `supabase/config.toml`:
```toml
[functions.expire-orders]
schedule = "*/5 * * * *"
```

---

## Trang success & failed

### `/checkout/success/[orderId]`
- Server Component, fetch order (verify user_id)
- Hiển thị: mã đơn, tóm tắt items, địa chỉ giao hàng, thông báo thành công
- CTA: "Xem chi tiết đơn hàng" → `/account/orders/[id]`
- CTA phụ: "Tiếp tục mua sắm" → `/`

### `/checkout/failed`
- Query params: `?reason=expired|payment_failed|unknown`
- Hiển thị message theo reason
- CTA: "Đặt lại đơn hàng" → `/checkout` (giữ cart)

---

## Payment state machine

```
                    ┌─────────────┐
                    │             │
             ┌──────▼──────┐      │
  Tạo order  │             │      │ webhook paid
  ──────────►│pending_     │──────┘──────────────► paid
             │payment      │                         │
             └──────┬──────┘                         │ admin
                    │                                 ▼
                    │ expires_at                processing
                    │ quá hạn                        │
                    ▼                                 │ admin
                 expired                          printing
                                                      │
             cancelled ◄────── admin                  │ admin + tracking
             (từ bất kỳ stage                     shipped
              nào trừ delivered)                      │
                                                      │ confirm
                                                  delivered
```

Các chuyển stage hợp lệ:
| Từ | Sang | Ai thực hiện |
|---|---|---|
| pending_payment | paid | Webhook SePay |
| pending_payment | expired | Edge Function (auto) |
| paid | processing | Admin |
| processing | printing | Admin |
| printing | shipped | Admin + nhập tracking |
| shipped | delivered | Admin (hoặc auto sau N ngày) |
| * (trừ delivered) | cancelled | Admin |