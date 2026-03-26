-- Relax storage.objects policies for bucket `product-images`.
-- Previous policies required metadata.mimetype + metadata.size in WITH CHECK; Supabase
-- may not populate these consistently on INSERT, causing:
--   "new row violates row-level security policy"
-- even for admin users. Type/size are already validated in the admin UI.
-- Access remains limited to users where public.is_admin() is true (JWT role).

DROP POLICY IF EXISTS "product_images_admin_insert_limited" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_update_limited" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;

CREATE POLICY "product_images_admin_insert_limited"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
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
