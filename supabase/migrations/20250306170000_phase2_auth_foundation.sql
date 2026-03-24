-- Phase 2 auth foundation: user profiles + order ownership policy alignment

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  default_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_user_read_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_user_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_user_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_read_all" ON public.user_profiles;

CREATE POLICY "user_profiles_user_read_own"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_profiles_user_insert_own"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_profiles_user_update_own"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_profiles_admin_read_all"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Keep orders.user_id in sync with auth architecture
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Auto-create profile after first sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

NOTIFY pgrst, 'reload schema';
