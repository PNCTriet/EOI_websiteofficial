-- Đơn custom: COD / thanh toán sau, domain link, email admin+khách
-- Chi tiêu khách: vẫn dùng snapshot trên order_items (app sẽ SUM dòng)

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_chk;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_chk
  CHECK (payment_method IN ('bank_transfer', 'cod', 'pay_later'));

ALTER TABLE public.custom_checkout_links
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'bank_transfer';

ALTER TABLE public.custom_checkout_links
  DROP CONSTRAINT IF EXISTS custom_checkout_links_payment_mode_chk;

ALTER TABLE public.custom_checkout_links
  ADD CONSTRAINT custom_checkout_links_payment_mode_chk
  CHECK (payment_mode IN ('bank_transfer', 'cod', 'pay_later'));

ALTER TABLE public.custom_checkout_links
  ADD COLUMN IF NOT EXISTS creator_email text;

ALTER TABLE public.custom_checkout_links
  ADD COLUMN IF NOT EXISTS customer_email text;

ALTER TABLE public.custom_checkout_links
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.custom_checkout_links.payment_mode IS
  'bank_transfer: tạo payment_intent; cod | pay_later: tạo đơn trực tiếp khi khách mở link.';
COMMENT ON COLUMN public.custom_checkout_links.creator_email IS 'Email admin tạo link.';
COMMENT ON COLUMN public.custom_checkout_links.customer_email IS 'Email khách (snapshot từ form).';
COMMENT ON COLUMN public.custom_checkout_links.order_id IS 'Đơn tạo sẵn (COD / thanh toán sau).';
