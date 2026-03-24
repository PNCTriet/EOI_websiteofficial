-- Phase 1.2: server cart for logged-in users (merge localStorage -> DB)

CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carts_user_id_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  color_index integer NOT NULL DEFAULT 0,
  color_hex text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_unique_line UNIQUE (cart_id, product_id, color_index)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carts_user_all" ON public.carts;
DROP POLICY IF EXISTS "cart_items_user_all" ON public.cart_items;

CREATE POLICY "carts_user_all"
  ON public.carts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "cart_items_user_all"
  ON public.cart_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND (c.user_id = auth.uid() OR public.is_admin())
    )
  );

-- updated_at maintenance
DROP TRIGGER IF EXISTS carts_set_updated_at ON public.carts;
CREATE TRIGGER carts_set_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS cart_items_set_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_set_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

NOTIFY pgrst, 'reload schema';
