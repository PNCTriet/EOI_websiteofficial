-- Email khi admin tạo link đơn custom (COD / thanh toán sau)

INSERT INTO public.email_templates (key, name, subject, html, enabled)
VALUES
  (
    'custom_order_link_ready',
    'Custom order — link (COD / pay later)',
    '[EOI] Link đơn hàng — {{payment_mode_label}}',
    '<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.45; color:#111;">' ||
      '<img src="{{logo_url}}" alt="EOI logo" style="width:160px; height:auto; margin-bottom:16px;" />' ||
      '<h2 style="margin:0 0 12px;">Đơn hàng dành cho bạn</h2>' ||
      '<p style="margin:0 0 10px;">Xin chào <strong>{{recipient_name}}</strong>,</p>' ||
      '<p style="margin:0 0 10px;">Bạn có một link để xác nhận đơn (<strong>{{payment_mode_label}}</strong>). Mở link bên dưới sau khi đăng nhập tài khoản EOI (nếu được yêu cầu).</p>' ||
      '<p style="margin:0 0 10px;">Tạm tính: <strong>{{order_total_display}}</strong></p>' ||
      '<p style="margin:0 0 10px;">Giao đến: <strong>{{shipping_address}}</strong></p>' ||
      '<p style="margin:0 0 14px;">Điện thoại: <strong>{{phone}}</strong></p>' ||
      '<p style="margin:0 0 14px;"><a href="{{checkout_url}}" style="display:inline-block; padding:12px 18px; background:#ff4fb0; color:#fff; text-decoration:none; border-radius:999px; font-weight:600;">Mở link đơn hàng</a></p>' ||
      '<p style="margin:0; font-size:12px; color:#666;">Nếu nút không hoạt động, copy link: {{checkout_url}}</p>' ||
      '<p style="margin:16px 0 0;"><a href="{{site_url}}" style="color:#ff4fb0;">eoilinhtinh.com</a></p>' ||
    '</div>',
    true
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  enabled = EXCLUDED.enabled,
  updated_at = now();
