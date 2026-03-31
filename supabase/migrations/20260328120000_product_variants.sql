-- Sub-products (variants): label, optional swatch color, per-variant images.
-- Replaces cart/order reliance on color_index only.

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color_hex text,
  image_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  image_thumb_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON public.product_variants (product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_sort
  ON public.product_variants (product_id, sort_order);

DROP TRIGGER IF EXISTS product_variants_set_updated_at ON public.product_variants;
CREATE TRIGGER product_variants_set_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_select_active_or_admin" ON public.product_variants;
CREATE POLICY "product_variants_select_active_or_admin"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_variants.product_id
        AND (p.is_active = true OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "product_variants_admin_write" ON public.product_variants;
CREATE POLICY "product_variants_admin_write"
  ON public.product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "product_variants_admin_update"
  ON public.product_variants
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "product_variants_admin_delete"
  ON public.product_variants
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Backfill variants from legacy jsonb colors array
INSERT INTO public.product_variants (product_id, label, sort_order, color_hex)
SELECT
  p.id,
  'Màu ' || t.ord::text,
  t.ord - 1,
  t.hex
FROM public.products p
CROSS JOIN LATERAL jsonb_array_elements_text(
  COALESCE(p.colors, '[]'::jsonb)
) WITH ORDINALITY AS t(hex, ord)
WHERE jsonb_array_length(COALESCE(p.colors, '[]'::jsonb)) > 0;

INSERT INTO public.product_variants (product_id, label, sort_order, color_hex)
SELECT p.id, 'Mặc định', 0, '#F472B6'
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id
);

-- cart_items: link to variant
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants (id) ON DELETE CASCADE;

UPDATE public.cart_items ci
SET variant_id = (
  SELECT COALESCE(
    (
      SELECT pv.id
      FROM public.product_variants pv
      WHERE pv.product_id = ci.product_id
        AND pv.sort_order = ci.color_index
      LIMIT 1
    ),
    (
      SELECT pv.id
      FROM public.product_variants pv
      WHERE pv.product_id = ci.product_id
      ORDER BY pv.sort_order ASC
      LIMIT 1
    )
  )
)
WHERE ci.variant_id IS NULL;

DELETE FROM public.cart_items WHERE variant_id IS NULL;

WITH totals AS (
  SELECT
    cart_id,
    variant_id,
    -- min(uuid) is not defined on all PG versions; min on text is stable
    MIN(id::text)::uuid AS keep_id,
    SUM(quantity)::integer AS total_q
  FROM public.cart_items
  GROUP BY cart_id, variant_id
  HAVING COUNT(*) > 1
)
UPDATE public.cart_items ci
SET quantity = t.total_q
FROM totals t
WHERE ci.id = t.keep_id;

DELETE FROM public.cart_items a
WHERE EXISTS (
  SELECT 1
  FROM public.cart_items b
  WHERE b.cart_id = a.cart_id
    AND b.variant_id = a.variant_id
    AND b.id < a.id
);

ALTER TABLE public.cart_items
  ALTER COLUMN variant_id SET NOT NULL;

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_unique_line;

ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_cart_variant_unique UNIQUE (cart_id, variant_id);

ALTER TABLE public.cart_items
  DROP COLUMN IF EXISTS color_index;

ALTER TABLE public.cart_items
  DROP COLUMN IF EXISTS color_hex;

-- order_items: snapshot variant
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants (id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_label_snapshot text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_image_snapshot text;

NOTIFY pgrst, 'reload schema';
