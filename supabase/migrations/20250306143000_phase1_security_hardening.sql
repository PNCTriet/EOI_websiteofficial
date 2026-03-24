-- Phase 1 security hardening (RLS + ownership + storage policy)

-- ---------------------------------------------------------------------------
-- Helper: admin check from JWT metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Orders ownership (align auth/payment architecture)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- ---------------------------------------------------------------------------
-- Rebuild public table policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_public_read_active" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_all" ON public.products;
DROP POLICY IF EXISTS "customers_authenticated_all" ON public.customers;
DROP POLICY IF EXISTS "orders_authenticated_all" ON public.orders;
DROP POLICY IF EXISTS "order_items_authenticated_all" ON public.order_items;
DROP POLICY IF EXISTS "order_stage_logs_authenticated_all" ON public.order_stage_logs;
DROP POLICY IF EXISTS "sepay_logs_authenticated_all" ON public.sepay_logs;

-- PRODUCTS:
-- - Public can read only active products
-- - Admin can CRUD
CREATE POLICY "products_public_read_active"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "products_admin_all"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- CUSTOMERS: admin only
CREATE POLICY "customers_admin_all"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ORDERS:
-- - User read own
-- - Admin full
CREATE POLICY "orders_user_read_own"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_user_insert_own"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "orders_admin_update_delete"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_admin_delete"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ORDER ITEMS:
-- - User can read own via joined order
-- - Admin full
CREATE POLICY "order_items_user_read_own"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "order_items_admin_all"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ORDER STAGE LOGS:
-- - User can read logs for own order
-- - Admin full
CREATE POLICY "order_stage_logs_user_read_own"
  ON public.order_stage_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_stage_logs.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "order_stage_logs_admin_all"
  ON public.order_stage_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SEPAY LOGS: admin only (service role bypasses RLS anyway)
CREATE POLICY "sepay_logs_admin_all"
  ON public.sepay_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: product-images tighten
-- - Public read
-- - Only admin can write
-- - image/* only, <= 5MB
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete" ON storage.objects;

CREATE POLICY "product_images_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_insert_limited"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
    AND COALESCE((metadata ->> 'mimetype') LIKE 'image/%', false)
    AND COALESCE((metadata ->> 'size')::bigint <= 5 * 1024 * 1024, false)
  );

CREATE POLICY "product_images_admin_update_limited"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
    AND COALESCE((metadata ->> 'mimetype') LIKE 'image/%', false)
    AND COALESCE((metadata ->> 'size')::bigint <= 5 * 1024 * 1024, false)
  );

CREATE POLICY "product_images_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

NOTIFY pgrst, 'reload schema';
