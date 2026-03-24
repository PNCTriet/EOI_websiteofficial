-- Estimated delivery window (days) per product for storefront
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_days_min integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_days_max integer NOT NULL DEFAULT 5;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_delivery_days_range_chk;

ALTER TABLE public.products
  ADD CONSTRAINT products_delivery_days_range_chk
  CHECK (delivery_days_max >= delivery_days_min AND delivery_days_min >= 0);
