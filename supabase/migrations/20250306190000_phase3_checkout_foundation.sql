-- Phase 3.1 checkout foundation

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS shipping_addr jsonb,
  ADD COLUMN IF NOT EXISTS note text;

CREATE INDEX IF NOT EXISTS idx_orders_sepay_ref ON public.orders(sepay_ref);
CREATE INDEX IF NOT EXISTS idx_orders_stage ON public.orders(stage);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON public.orders(expires_at);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_chk;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_chk
  CHECK (payment_method IN ('bank_transfer'));

NOTIFY pgrst, 'reload schema';
