# EOI — Ops Notes (Backups, Staging, Region)

> Mục tiêu: sau khi release, hệ thống không mất dữ liệu và có môi trường staging tách biệt.

---

## 1) Region evaluation (Vercel + Supabase)

Khuyến nghị:
- Vercel: `ap-southeast-1` (Singapore)
- Supabase: chọn cùng region trong Supabase Project Settings (ví dụ Singapore nếu có)

Cách kiểm tra:
1. Mở Vercel → Project Settings → Regions (hoặc Runtime)
2. Đặt Region cho app thành `ap-southeast-1`
3. Mở Supabase → Project Settings → Region (nếu chưa đúng, cần tạo project mới theo region)
4. Dùng công cụ đo RTT thực tế (vd: Lighthouse / WebPageTest / browser devtools) trên khu vực VN để so sánh trước/sau.

---

## 2) Supabase backup strategy

Khuyến nghị triển khai theo 2 lớp:
1. Backups tự động của Supabase (automated backups)
   - bật theo lịch của Supabase (weekly/daily tùy gói)
2. Backup thủ công định kỳ khi release (manual export)
   - Với Supabase CLI: `supabase db dump` (nếu có dùng supabase-cli)
   - Hoặc export schema + data quan trọng sang nơi lưu trữ riêng (S3/GDrive) theo lịch.

Checklist trước release:
- xác nhận automated backups đang bật
- chốt lịch manual dump (vd: mỗi tuần 1 lần hoặc sau mỗi batch migration)
- lưu bản dump vào nơi có versioning.

---

## 3) Staging environment (tách production)

Khuyến nghị tách theo 2 cách:
1. Vercel Preview + Environment Variables
   - mỗi PR/branch tạo preview tự động
   - đặt env key để trỏ sang Supabase “staging” (project khác)
2. Supabase staging project riêng
   - tạo Supabase project cho staging (cùng region như prod nếu có thể)
   - apply migrations tương tự production

Các biến env nên có:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (có thể dùng chung nếu cùng provider)
- `NEXT_PUBLIC_SITE_URL`

Thực hành:
- Khi deploy staging, confirm email/send vẫn chạy nhưng không ảnh hưởng khách thật (nếu cần, dùng audience “custom list” trong admin).

