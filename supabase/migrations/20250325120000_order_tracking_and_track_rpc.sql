-- Fulfillment: carrier + tracking when order ships
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_carrier text;

-- Public lookup by order ref + email (SECURITY DEFINER; no direct table SELECT for anon)
CREATE OR REPLACE FUNCTION public.track_order_by_ref_email(p_ref text, p_email text)
RETURNS TABLE (
  id uuid,
  sepay_ref text,
  stage public.order_stage,
  total_amount integer,
  created_at timestamptz,
  paid_at timestamptz,
  tracking_number text,
  shipping_carrier text,
  shipping_addr jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.sepay_ref,
    o.stage,
    o.total_amount,
    o.created_at,
    o.paid_at,
    o.tracking_number,
    o.shipping_carrier,
    o.shipping_addr
  FROM public.orders o
  WHERE
    o.sepay_ref IS NOT NULL
    AND trim(lower(o.sepay_ref)) = trim(lower(p_ref))
    AND (
      trim(lower(COALESCE(o.shipping_addr->>'email', ''))) = trim(lower(p_email))
      OR EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = o.customer_id
          AND c.email IS NOT NULL
          AND trim(lower(c.email)) = trim(lower(p_email))
      )
      OR EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = o.user_id
          AND trim(lower(u.email::text)) = trim(lower(p_email))
      )
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.track_order_by_ref_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_order_by_ref_email(text, text) TO anon, authenticated;
