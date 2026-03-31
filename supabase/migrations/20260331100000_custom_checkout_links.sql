-- Đơn / intent "custom": ẩn khỏi danh sách đơn tài khoản, chỉ mở đúng khi có link kèm token.

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS hidden_from_account_list boolean NOT NULL DEFAULT false;

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS link_access_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_link_access_token
  ON public.payment_intents (link_access_token)
  WHERE link_access_token IS NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS hidden_from_account_list boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS link_access_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_link_access_token
  ON public.orders (link_access_token)
  WHERE link_access_token IS NOT NULL;

COMMENT ON COLUMN public.payment_intents.hidden_from_account_list IS 'Khi true: đơn không hiện trong /account/orders; cần ?access=token để xem pending/success.';
COMMENT ON COLUMN public.payment_intents.link_access_token IS 'Token bí mật cho ?access= (chỉ khi hidden_from_account_list).';
COMMENT ON COLUMN public.orders.hidden_from_account_list IS 'Sao chép từ payment_intents khi thanh toán xong.';
COMMENT ON COLUMN public.orders.link_access_token IS 'Sao chép từ payment_intents; cần ?access= để xem chi tiết đơn.';

-- Link draft để admin nhập thông tin trước, khách đăng nhập sau.
CREATE TABLE IF NOT EXISTS public.custom_checkout_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  cart_snapshot jsonb NOT NULL,
  shipping_addr jsonb NOT NULL,
  note text,
  hide_from_account_list boolean NOT NULL DEFAULT true,
  claimed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_checkout_links_token
  ON public.custom_checkout_links (token);

CREATE INDEX IF NOT EXISTS idx_custom_checkout_links_payment_intent
  ON public.custom_checkout_links (payment_intent_id);
