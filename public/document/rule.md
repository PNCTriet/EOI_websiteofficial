# eoi design & code rules

## i18n (VI / EN)
- Cookie `eoi_locale`: `vi` (mặc định) hoặc `en`
- `POST /api/locale` với body `{ "locale": "vi" | "en" }` — set cookie, sau đó `router.refresh()`
- Chuỗi UI: `src/i18n/dictionaries.ts` (cùng cấu trúc cho `vi` và `en`)
- Server: `getServerI18n()` + `t(messages, "path.to.key")` từ `@/i18n/translate`
- Client: `useTranslations()` từ `@/components/locale-provider`
- Chuyển ngôn ngữ: `<LanguageSwitcher />` (store header + admin sidebar / mobile bar + trang login)

## stack
- Next.js 14+ App Router, TypeScript strict
- Tailwind CSS (no CSS modules, no styled-components)
- Supabase (@supabase/supabase-js + @supabase/ssr)
- lucide-react (icon library DUY NHẤT — không import từ bất kỳ thư viện icon nào khác)
- Package manager: npm

## typescript
- Không dùng `any` — luôn type rõ ràng
- Dùng type từ `@/types/database.ts` cho mọi query Supabase
- Server Components là default — chỉ thêm "use client" khi thực sự cần interactivity
- Tất cả async Server Components phải await đầy đủ

## file & folder conventions
- Route groups: `(store)` cho storefront public, `(admin)` cho admin panel
- Supabase clients: `@/lib/supabase/client.ts` (browser), `@/lib/supabase/server.ts` (server)
- Tất cả page fetch data dùng Server Component
- Client Component chỉ cho: form submit, auth actions, UI interactivity (dropdown, modal, v.v.)

## icons — lucide-react only
- Import: `import { ShoppingCart, Package, User } from 'lucide-react'`
- Nav icons: size={22} strokeWidth={1.8}
- Inline icons: size={16} strokeWidth={1.8}
- Action icons (button): size={18} strokeWidth={2}
- KHÔNG dùng emoji làm icon
- KHÔNG dùng heroicons, react-icons, phosphor hoặc bất kỳ thư viện nào khác

## design system — màu sắc
--eoi-pink:        #F472B6   /* accent chính — CTA, badge hot, logo */
--eoi-pink-dark:   #BE185D
--eoi-pink-light:  #FCE7F3
--eoi-blue:        #3B82F6   /* accent phụ — category, info badge */
--eoi-blue-dark:   #1D4ED8
--eoi-blue-light:  #DBEAFE
--eoi-amber:       #F59E0B   /* accent thứ 3 — giá highlight, tag mới */
--eoi-amber-dark:  #B45309
--eoi-amber-light: #FEF3C7
--eoi-ink:         #111111   /* text chính, button primary /
--eoi-ink2:        #444444   / text phụ /
--eoi-surface:     #FAFAFA   / card background /
--eoi-border:      #EBEBEB   / border mặc định /
--eoi-bg:          #F5F3EF   / page background */
Dùng các biến này trong tailwind qua className hoặc style inline — không hardcode hex lạ.

Quy tắc dùng màu:
- Pink → CTA chính, badge "Hot", logo, highlight quan trọng
- Blue → danh mục, info, badge "Mới", link
- Amber → giá sản phẩm, badge "Sale", rating
- Ink (#111) → button add-to-cart, text heading, nav active
- KHÔNG dùng purple gradient — đó là AI slop

## typography
- Font chính: **Inter** (Google Fonts, `next/font/google`) — subsets `latin` + `vietnamese`
- Heading / logo / giá: `font-syne` hoặc `font-bold` / `font-extrabold` — weight 700–800, letter-spacing: -0.02em đến -0.04em tuỳ block
- Body / label / description: `font-dm` hoặc `font-sans` — weight 400/500/600
- Trong Tailwind: `font-sans` = Inter; `font-syne` / `font-dm` là alias cùng Inter (giữ class cũ không đổi)
- Fallback: system-ui, -apple-system, Segoe UI, Roboto, Arial

## spacing & border-radius
- Page padding: 20px (mobile), 24px (tablet+)
- Card gap: 12px
- Inner padding card: 12px–16px
- border-radius pill (button, badge): 999px
- border-radius card: 16px
- border-radius chip/tag: 10px
- border-radius icon button: 50%

## components pattern

### Button variants
```tsx
// Primary (add to cart, confirm)
<button className="bg-[#111] text-white rounded-full px-5 py-3 font-sans font-semibold text-sm">

// Accent pink (hero CTA)
<button className="bg-[#F472B6] text-white rounded-full px-5 py-3 font-sans font-semibold text-sm flex items-center gap-2">

// Ghost (secondary action)
<button className="bg-white text-[#111] border border-[#ddd] rounded-full px-5 py-3 font-sans font-medium text-sm">

// Icon button round
<button className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F472B6]">
  <Plus size={16} strokeWidth={2.5} color="white" />
</button>
```

### Badge / pill
```tsx
// Hot
<span className="text-[10px] font-bold tracking-wide bg-[#FCE7F3] text-[#BE185D] px-2 py-1 rounded-full">Hot</span>

// Mới
<span className="text-[10px] font-bold tracking-wide bg-[#DBEAFE] text-[#1D4ED8] px-2 py-1 rounded-full">Mới</span>

// Sale
<span className="text-[10px] font-bold tracking-wide bg-[#FEF3C7] text-[#B45309] px-2 py-1 rounded-full">Sale</span>
```

### Product card
```tsx
<div className="bg-[#FAFAFA] rounded-2xl border border-[#ebebeb] overflow-hidden">
  <div className="h-36 flex items-center justify-center relative" style={{background: '#FCE7F3'}}>
    {/* badge */}
    {/* product image / 3D preview */}
  </div>
  <div className="p-3">
    <p className="font-syne font-bold text-[13px] text-[#111] leading-tight mb-1">Tên sản phẩm</p>
    <p className="text-[11px] text-[#888] mb-2">Vật liệu · màu sắc</p>
    <div className="flex justify-between items-center">
      <span className="font-syne font-extrabold text-[15px] text-[#111]">85k</span>
      <button className="w-7 h-7 rounded-full bg-[#F472B6] flex items-center justify-center">
        <Plus size={14} strokeWidth={2.5} color="white" />
      </button>
    </div>
  </div>
</div>
```

### Bottom navigation (mobile)
```tsx
// 4 items: Home, Search, Cart, Account
// Active: color pink #F472B6
// Inactive: color #BBBBBB
// Label: 10px font-dm / font-sans
// Icon: size 22, strokeWidth 1.8
```

### Admin sidebar
```tsx
// Background: #111 (dark)
// Active item: bg white/10, text white, border-left 3px solid #F472B6
// Inactive: text #888
// Logo eoi: font-extrabold, màu theo brand
```

## mobile-first rules
- Tất cả layout mặc định cho mobile (375px)
- Breakpoint tablet: md: (768px)
- Breakpoint desktop: lg: (1024px)
- Touch target tối thiểu: 44px × 44px
- Bottom nav cố định: fixed bottom-0, safe-area-inset
- Không dùng hover-only interaction — luôn có active state

## admin UI rules
- Sidebar dark (#111) với icon + label
- Content area: background #F5F3EF
- Stat cards: white, shadow nhẹ, số dùng font-extrabold (Inter)
- Table: striped nhẹ, action buttons nhỏ gọn
- Stage badges dùng màu semantic:
  - pending_payment → amber
  - paid → blue  
  - processing / printing → pink
  - shipped / delivered → green (#16a34a)
  - cancelled → red (#dc2626)

## supabase patterns
```ts
// Server Component — luôn dùng createClient từ server.ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data, error } = await supabase.from('products').select('*')

// Client Component — dùng client.ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Webhook / API route — dùng service role
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## error & loading states
- Mọi page fetch data phải có loading skeleton (dùng Tailwind animate-pulse)
- Mọi form phải có disabled state khi đang submit
- Error message: text đỏ nhỏ dưới field, không dùng alert()
- Redirect sau submit dùng `router.push()` hoặc `redirect()` từ next/navigation

## không được làm
- KHÔNG cài shadcn, MUI, Chakra, Ant Design hay bất kỳ UI component library nào
- KHÔNG dùng CSS module (.module.css)
- KHÔNG hardcode màu hex lạ ngoài design system ở trên
- KHÔNG dùng icon từ thư viện khác ngoài lucide-react
- KHÔNG expose SUPABASE_SERVICE_ROLE_KEY ra client (không có prefix NEXT_PUBLIC_)
- KHÔNG để `any` trong TypeScript
- KHÔNG dùng purple gradient — đó là cliché AI design