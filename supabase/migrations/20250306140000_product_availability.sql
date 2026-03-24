-- Trạng thái: còn hàng / sắp ra mắt / hết hàng — giá có thể NULL khi coming_soon
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'in_stock';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_availability_chk;

ALTER TABLE public.products
  ADD CONSTRAINT products_availability_chk
  CHECK (availability IN ('in_stock', 'coming_soon', 'out_of_stock'));

-- Cho phép price NULL; bắt buộc có giá khi in_stock / out_of_stock
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_price_check;

ALTER TABLE public.products
  ALTER COLUMN price DROP NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_price_availability_chk;

ALTER TABLE public.products
  ADD CONSTRAINT products_price_availability_chk
  CHECK (
    (availability = 'coming_soon' AND (price IS NULL OR price >= 0))
    OR (
      availability IN ('in_stock', 'out_of_stock')
      AND price IS NOT NULL
      AND price >= 0
    )
  );

-- Bắt API (PostgREST) nhận cột mới ngay (tránh lỗi schema cache)
NOTIFY pgrst, 'reload schema';
