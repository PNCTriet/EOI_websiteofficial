-- Thumbnail strategy for product images

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_thumb_urls jsonb;

