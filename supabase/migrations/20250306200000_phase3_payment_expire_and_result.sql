-- Phase 3.2 remaining: expired stage + payment result pages support

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_stage' AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.order_stage ADD VALUE 'expired' AFTER 'cancelled';
  END IF;
END$$;

NOTIFY pgrst, 'reload schema';
