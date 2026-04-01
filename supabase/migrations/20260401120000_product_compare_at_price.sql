-- Giá gốc (trước giảm) — chỉ hiển thị; giá bán thực tế vẫn là products.price
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price integer;

COMMENT ON COLUMN public.products.compare_at_price IS
  'Optional list/strike-through price in VND; must exceed price when set, for sale display.';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_compare_at_price_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_compare_at_price_check
  CHECK (compare_at_price IS NULL OR compare_at_price >= 0);
