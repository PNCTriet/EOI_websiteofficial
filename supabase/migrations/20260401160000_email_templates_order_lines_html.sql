-- Thêm bảng chi tiết sản phẩm ({{order_lines_html}}) vào mail xác nhận đơn

INSERT INTO public.email_templates (key, name, subject, html, enabled)
VALUES
  (
    'order_created',
    'Order confirmation (created)',
    '[EOI] Order received: {{order_ref}}',
    '<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.45; color:#111;">' ||
      '<img src="{{logo_url}}" alt="EOI logo" style="width:160px; height:auto; margin-bottom:16px;" />' ||
      '<h2 style="margin:0 0 12px;">Thanks for your order</h2>' ||
      '<p style="margin:0 0 10px;">Hi <strong>{{recipient_name}}</strong>,</p>' ||
      '<p style="margin:0 0 10px;">We''ve received your order.</p>' ||
      '<p style="margin:0 0 10px;">Order ref: <strong>{{order_ref}}</strong></p>' ||
      '<h3 style="margin:16px 0 8px;font-size:16px;">Order details</h3>' ||
      '{{order_lines_html}}' ||
      '<p style="margin:0 0 10px;">Total: <strong>{{order_total_display}}</strong></p>' ||
      '<p style="margin:0 0 10px;">Shipping to: <strong>{{shipping_address}}</strong></p>' ||
      '<p style="margin:0 0 18px;">Phone: <strong>{{phone}}</strong></p>' ||
      '<p style="margin:0 0 14px;">We will email you again when your order is shipped (with carrier + tracking number).</p>' ||
      '<a href="{{site_url}}" style="display:inline-block; padding:10px 14px; background:#ff4fb0; color:#fff; text-decoration:none; border-radius:999px; font-weight:600;">Visit store</a>' ||
    '</div>',
    true
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  enabled = EXCLUDED.enabled,
  updated_at = now();

INSERT INTO public.email_templates (key, name, subject, html, enabled)
VALUES
  (
    'order_paid',
    'Order paid confirmation',
    '[EOI] We got your payment - {{order_ref}}',
    '<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.45; color:#111;">' ||
      '<h2 style="margin:0 0 12px;">Thank you for your order</h2>' ||
      '<p style="margin:0 0 10px;">Order: <strong>{{order_ref}}</strong></p>' ||
      '<h3 style="margin:16px 0 8px;font-size:16px;">Order details</h3>' ||
      '{{order_lines_html}}' ||
      '<p style="margin:12px 0 10px;">Total: <strong>{{order_total_display}}</strong></p>' ||
      '<p style="margin:0;">We will update you as soon as your order moves to shipping.</p>' ||
    '</div>',
    true
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html = EXCLUDED.html,
  enabled = EXCLUDED.enabled,
  updated_at = now();

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
      '<h3 style="margin:16px 0 8px;font-size:16px;">Chi tiết sản phẩm</h3>' ||
      '{{order_lines_html}}' ||
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
