# EOI — Order Management Spec

> Phạm vi: Admin quản lý đơn hàng + User xem đơn của mình + Tra cứu công khai

---

## Stage overview

```
pending_payment → paid → processing → printing → shipped → delivered
                                                          ↘
                     expired (auto)              cancelled (admin, bất kỳ stage trừ delivered)
```

Chi tiết từng stage:

| Stage | Màu badge | Ý nghĩa | Ai thay đổi |
|---|---|---|---|
| `pending_payment` | amber | Đơn tạo, chờ CK | Hệ thống |
| `paid` | blue | Đã nhận tiền | Webhook SePay |
| `processing` | pink | Đang xác nhận, chuẩn bị | Admin |
| `printing` | pink | Đang in 3D | Admin |
| `shipped` | purple | Đã giao vận chuyển | Admin |
| `delivered` | green | Khách đã nhận | Admin |
| `expired` | gray | Hết hạn thanh toán | Edge Function |
| `cancelled` | red | Đã huỷ | Admin |

---

## Validate chuyển stage — server-side

```typescript
// src/lib/order-stages.ts

export const ORDER_STAGES = [
  'pending_payment',
  'paid',
  'processing',
  'printing',
  'shipped',
  'delivered',
  'expired',
  'cancelled',
] as const

export type OrderStage = typeof ORDER_STAGES[number]

// Map stage → các stage được phép chuyển sang
export const VALID_TRANSITIONS: Record<OrderStage, OrderStage[]> = {
  pending_payment: ['expired', 'cancelled'],
  paid:            ['processing', 'cancelled'],
  processing:      ['printing', 'cancelled'],
  printing:        ['shipped', 'cancelled'],
  shipped:         ['delivered', 'cancelled'],
  delivered:       [], // terminal — không được thay đổi
  expired:         [], // terminal
  cancelled:       [], // terminal
}

export function canTransition(from: OrderStage, to: OrderStage): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// Label tiếng Việt cho UI
export const STAGE_LABELS: Record<OrderStage, string> = {
  pending_payment: 'Chờ thanh toán',
  paid:            'Đã thanh toán',
  processing:      'Đang xử lý',
  printing:        'Đang in',
  shipped:         'Đang giao',
  delivered:       'Đã giao',
  expired:         'Hết hạn',
  cancelled:       'Đã huỷ',
}

// Màu Tailwind cho badge
export const STAGE_COLORS: Record<OrderStage, { bg: string; text: string }> = {
  pending_payment: { bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]' },
  paid:            { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  processing:      { bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' },
  printing:        { bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' },
  shipped:         { bg: 'bg-[#EDE9FE]', text: 'text-[#6D28D9]' },
  delivered:       { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]' },
  expired:         { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]' },
  cancelled:       { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
}
```

---

## Admin — Server Action cập nhật stage

```typescript
// src/app/api/admin/orders/[id]/stage/route.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { canTransition, type OrderStage } from '@/lib/order-stages'
import { revalidatePath } from 'next/cache'

export async function updateOrderStage(
  orderId: string,
  toStage: OrderStage,
  extra?: { tracking_number?: string; shipping_carrier?: string }
) {
  const supabase = await createClient()

  // 1. Lấy stage hiện tại
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, stage')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error('Không tìm thấy đơn hàng')

  const fromStage = order.stage as OrderStage

  // 2. Validate transition hợp lệ
  if (!canTransition(fromStage, toStage)) {
    throw new Error(`Không thể chuyển từ "${fromStage}" sang "${toStage}"`)
  }

  // 3. Chuẩn bị update data
  const updateData: Record<string, unknown> = { stage: toStage }
  if (toStage === 'shipped' && extra?.tracking_number) {
    updateData.tracking_number  = extra.tracking_number
    updateData.shipping_carrier = extra.shipping_carrier ?? null
  }

  // 4. Update order
  await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)

  // 5. Log stage change
  await supabase.from('order_stage_logs').insert({
    order_id:   orderId,
    from_stage: fromStage,
    to_stage:   toStage,
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
}
```

---

## Admin — UI trang chi tiết đơn hàng

```
/admin/orders/[id]
┌──────────────────────────────────────────────┐
│ ← Quay lại          Đơn EOI-A3K9P2           │
│                                              │
│  [Thông tin khách]        [Thông tin đơn]    │
│  ┌──────────────────┐    ┌────────────────┐  │
│  │ Nguyễn Văn A      │    │ Ngày tạo       │  │
│  │ 0909 123 456      │    │ Tổng tiền      │  │
│  │ 123 Đường ABC,    │    │ Trạng thái: ██ │  │
│  │ Q.1, TP.HCM       │    │ Thanh toán: ██ │  │
│  └──────────────────┘    └────────────────┘  │
│                                              │
│  [Sản phẩm trong đơn]                        │
│  ┌──────────────────────────────────────┐    │
│  │ [ảnh] Tên SP          x2   170.000đ  │    │
│  │ [ảnh] Tên SP          x1    85.000đ  │    │
│  │                    Tổng: 255.000đ    │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  [Cập nhật stage]                            │
│  ┌──────────────────────────────────────┐    │
│  │ Chuyển sang: [dropdown các stage hợp│    │
│  │              lệ từ stage hiện tại]   │    │
│  │                                      │    │
│  │ (nếu sang shipped):                  │    │
│  │ Mã vận đơn: [___________]            │    │
│  │ Đơn vị VC:  [___________]            │    │
│  │                                      │    │
│  │ [Cập nhật stage]                     │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  [Lịch sử stage]  (timeline vertical)        │
│  ● Tạo đơn          2025-03-20 10:30         │
│  ● Đã thanh toán    2025-03-20 10:45         │
│  ● Đang xử lý       2025-03-20 11:00         │
│  ○ ...                                       │
└──────────────────────────────────────────────┘
```

### Component UpdateStageForm (Client Component)
```typescript
// Chỉ hiển thị dropdown với các option stage HỢP LỆ từ stage hiện tại
// Nếu toStage === 'shipped': hiển thị thêm input tracking_number, shipping_carrier
// Submit gọi POST /api/admin/orders/[id]/stage
// Hiển thị error nếu transition không hợp lệ
```

---

## Admin — trang danh sách orders

### Filter & Search
```typescript
// searchParams:
// ?stage=paid          — filter theo stage
// ?q=EOI-A3K9P2        — search theo sepay_ref
// ?q=nguyen van a      — search theo tên khách
// ?from=2025-03-01     — từ ngày
// ?to=2025-03-31       — đến ngày
```

### Fetch query
```typescript
let query = supabase
  .from('orders')
  .select(`
    id, sepay_ref, total_amount, stage, created_at, paid_at,
    customers:user_profiles!user_id (full_name, phone)
  `)
  .order('created_at', { ascending: false })

if (stage)      query = query.eq('stage', stage)
if (q)          query = query.or(`sepay_ref.ilike.%${q}%`)
if (fromDate)   query = query.gte('created_at', fromDate)
if (toDate)     query = query.lte('created_at', toDate)
```

### Export CSV
```typescript
// src/app/api/admin/orders/export/route.ts
// GET với query params giống filter trên
// Trả về CSV với headers:
// Mã đơn, Khách hàng, SĐT, Tổng tiền, Stage, Ngày tạo, Ngày thanh toán, Tracking
```

---

## User — trang `/account/orders`

```
/account/orders
┌────────────────────────────────────┐
│  Đơn hàng của tôi                  │
│                                    │
│  ┌────────────────────────────┐    │
│  │ EOI-A3K9P2                 │    │
│  │ 20/03/2025  ·  255.000đ    │    │
│  │ [Đang in ████]             │    │
│  │            [Xem chi tiết →]│    │
│  └────────────────────────────┘    │
│                                    │
│  ┌────────────────────────────┐    │
│  │ EOI-B7MP91                 │    │
│  │ 15/03/2025  ·   85.000đ    │    │
│  │ [Đã giao   ████]           │    │
│  │            [Xem chi tiết →]│    │
│  └────────────────────────────┘    │
└────────────────────────────────────┘
```

Fetch:
```typescript
const { data: orders } = await supabase
  .from('orders')
  .select(`
    id, sepay_ref, total_amount, stage, created_at,
    order_items (
      quantity, unit_price, snapshot
    )
  `)
  .eq('user_id', user.id)         // RLS cũng enforce điều này
  .not('stage', 'in', '("pending_payment","expired")')  // ẩn đơn chưa TT / hết hạn
  .order('created_at', { ascending: false })
```

---

## User — trang `/account/orders/[id]`

```
/account/orders/[id]
┌────────────────────────────────────────┐
│ ← Đơn hàng của tôi                     │
│                                        │
│  EOI-A3K9P2  ·  [Đang in]             │
│                                        │
│  [Sản phẩm]                            │
│  ┌──────────────────────────────────┐  │
│  │ [ảnh] Hộp đựng trang sức  x2    │  │
│  │        85.000đ × 2 = 170.000đ   │  │
│  │                                  │  │
│  │ [ảnh] Đế điện thoại       x1    │  │
│  │        65.000đ × 1 =  65.000đ   │  │
│  │                    ────────────  │  │
│  │                    235.000đ      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Địa chỉ giao hàng]                   │
│  Nguyễn Văn A · 0909 123 456           │
│  123 Đường ABC, Phường 1, Q.1, HCM     │
│                                        │
│  [Trạng thái đơn hàng]  (timeline)     │
│  ✓ Đặt hàng      20/03 10:30          │
│  ✓ Đã thanh toán 20/03 10:45          │
│  ✓ Đang xử lý    20/03 11:00          │
│  ● Đang in       20/03 14:00  ← now   │
│  ○ Đang giao                           │
│  ○ Đã giao                             │
│                                        │
│  (nếu shipped):                        │
│  Mã vận đơn: 1234567890               │
│  GHTK  [Theo dõi →]                   │
└────────────────────────────────────────┘
```

Fetch (Server Component, bảo vệ bằng user_id):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

const { data: order } = await supabase
  .from('orders')
  .select(`
    id, sepay_ref, total_amount, stage, created_at, paid_at,
    shipping_addr, note, tracking_number, shipping_carrier,
    order_items (
      quantity, unit_price, snapshot
    ),
    order_stage_logs (
      from_stage, to_stage, changed_at
    )
  `)
  .eq('id', params.id)
  .eq('user_id', user!.id)   // verify ownership
  .single()

if (!order) notFound()
```

### Timeline component
```typescript
// Hiển thị các stage đã qua (✓, màu xanh) và stage hiện tại (●, màu pink)
// Stage chưa đến (○, màu gray)
// Bỏ qua expired/cancelled trong happy path timeline
// Nếu order đang expired hoặc cancelled — hiển thị trạng thái đặc biệt thay vì timeline
```

---

## Tra cứu công khai `/track`

Không cần login, tra theo mã đơn + email:

```
/track
┌──────────────────────────────────┐
│  Tra cứu đơn hàng                │
│                                  │
│  Mã đơn:  [EOI-______]           │
│  Email:   [___________]          │
│                                  │
│  [Tra cứu]                       │
└──────────────────────────────────┘
```

```typescript
// src/app/track/page.tsx — Server Component với searchParams
// Nếu có ?ref=EOI-A3K9P2&email=user@example.com thì fetch và hiển thị

// Dùng service role để query (không bị RLS block)
// Nhưng chỉ trả về thông tin hạn chế: stage, updated_at, shipping_carrier, tracking_number
// KHÔNG hiển thị: tổng tiền, địa chỉ đầy đủ, thông tin khách
```

---

## Email notifications
Hệ thống dùng **Resend** và quản lý template/campaign/log trong DB.

### Template & dữ liệu
- Bảng `email_templates`: quản lý HTML + subject theo `key`
- Bảng `email_campaigns`: chiến dịch marketing (broadcast)
- Bảng `email_logs`: log trạng thái gửi + event (delivered/opened/clicked/...)

Seed mặc định:
- `order_created`: email xác nhận khi order được tạo (sau webhook paid)
- `order_paid`: email xác nhận đã thanh toán (sau webhook paid)
- `order_shipped`: email thông báo đang giao (khi admin chuyển stage → `shipped`)
- `marketing_broadcast`: template marketing (admin có thể dùng làm campaign)

### Trigger gửi email (auto)
| Sự kiện | Email gửi | Nguồn |
|---|---|---|
| Webhook payment tạo `orders` (stage → `paid`) | `order_created` + `order_paid` | `POST /api/webhook/payment` |
| Admin chuyển stage → `shipped` | `order_shipped` (cần carrier + tracking) | `POST /api/admin/orders/[id]/stage` |

### Marketing / campaign (manual)
- Admin tạo campaign trong `/admin/emails`
- API: `POST /api/admin/email/campaigns/send`
- Audience:
  - `all_customers`: lấy email từ `orders.shipping_addr`
  - `paid_customers`: chỉ lấy từ `orders` có `paid_at`
  - `custom`: admin nhập danh sách email

### Theo dõi trạng thái email
- Resend webhook: `POST /api/webhook/resend`
- Hệ thống cập nhật `email_logs.status` + `event_type`
- Admin xem trong `/admin/emails` (Email log + Recent campaigns)

---

## Checklist admin panel bổ sung

- [ ] Trang `/admin/orders` — thêm filter theo stage, search, date range
- [ ] Trang `/admin/orders/[id]` — cập nhật stage với validate transition
- [ ] Khi stage = shipped: bắt buộc nhập tracking_number
- [ ] Export CSV đơn hàng (admin)
- [ ] Dashboard: thêm chart doanh thu theo ngày/tuần (recharts hoặc thuần SVG)
- [ ] Bảng `sepay_logs` xem được trong admin (debug payment issues)