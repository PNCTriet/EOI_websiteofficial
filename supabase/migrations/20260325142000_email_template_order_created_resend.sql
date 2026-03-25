-- Add template: order_created (order confirmation email)

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
      '<p style="margin:0 0 10px;">Total: <strong>{{order_total}}</strong></p>' ||
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

