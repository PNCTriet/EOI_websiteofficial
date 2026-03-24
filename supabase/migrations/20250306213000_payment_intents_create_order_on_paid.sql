-- Create payment intents so orders are created only after successful payment

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sepay_ref text NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount >= 0),
  cart_snapshot jsonb NOT NULL,
  shipping_addr jsonb,
  note text,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON public.payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON public.payment_intents(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_intents_sepay_ref ON public.payment_intents(sepay_ref);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_intents_user_read_own" ON public.payment_intents;
DROP POLICY IF EXISTS "payment_intents_user_insert_own" ON public.payment_intents;
DROP POLICY IF EXISTS "payment_intents_admin_all" ON public.payment_intents;

CREATE POLICY "payment_intents_user_read_own"
  ON public.payment_intents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "payment_intents_user_insert_own"
  ON public.payment_intents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "payment_intents_admin_all"
  ON public.payment_intents
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS payment_intents_set_updated_at ON public.payment_intents;
CREATE TRIGGER payment_intents_set_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

NOTIFY pgrst, 'reload schema';
