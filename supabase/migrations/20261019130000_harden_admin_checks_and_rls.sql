-- Harden admin/staff checks + enable RLS on custom_checkout_links.
--
-- 1) is_admin() / is_staff_or_admin(): trust ONLY app_metadata.role.
--    user_metadata is writable by the user (supabase.auth.updateUser), so it
--    must never grant privileges. Signatures, language and volatility are
--    unchanged (LANGUAGE sql, STABLE, SECURITY INVOKER); search_path pinned.
-- 2) custom_checkout_links: only accessed server-side via the service role
--    (which bypasses RLS). Enable RLS with no policies = deny-all for client
--    roles, and drop client grants as defense in depth.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff'),
    false
  );
$$;

ALTER TABLE public.custom_checkout_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.custom_checkout_links FROM anon, authenticated;
