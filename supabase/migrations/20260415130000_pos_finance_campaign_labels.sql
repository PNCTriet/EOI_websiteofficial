-- POS + Campaign + Finance + Label system (non-breaking extension)

-- ---------------------------------------------------------------------------
-- Role extension
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_role_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('admin', 'staff', 'user'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'staff'),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- Campaign
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  started_at timestamptz,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_admin_all" ON public.campaigns;
CREATE POLICY "campaigns_admin_all"
  ON public.campaigns
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Orders extension
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_source_check
      CHECK (source IN ('online', 'pos', 'custom'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_staff_id ON public.orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON public.orders(campaign_id);

-- ---------------------------------------------------------------------------
-- POS sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  note text
);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_staff_id ON public.pos_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON public.pos_sessions(opened_at DESC);

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_sessions_staff_read_own" ON public.pos_sessions;
DROP POLICY IF EXISTS "pos_sessions_staff_insert" ON public.pos_sessions;
DROP POLICY IF EXISTS "pos_sessions_admin_all" ON public.pos_sessions;

CREATE POLICY "pos_sessions_staff_read_own"
  ON public.pos_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_staff_or_admin()
      AND staff_id = auth.uid()
    )
  );

CREATE POLICY "pos_sessions_staff_insert"
  ON public.pos_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_staff_or_admin()
      AND staff_id = auth.uid()
    )
  );

CREATE POLICY "pos_sessions_admin_all"
  ON public.pos_sessions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  supplier text,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  purchased_at date NOT NULL,
  note text
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_campaign_id ON public.material_purchases(campaign_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_purchased_at ON public.material_purchases(purchased_at DESC);

CREATE TABLE IF NOT EXISTS public.equipment_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  name text NOT NULL,
  purchase_price numeric NOT NULL,
  purchased_at date NOT NULL,
  expected_life_months int,
  status text NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_equipment_assets_campaign_id ON public.equipment_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_purchased_at ON public.equipment_assets(purchased_at DESC);

CREATE TABLE IF NOT EXISTS public.operational_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  cost_date date NOT NULL,
  note text
);

CREATE INDEX IF NOT EXISTS idx_operational_costs_campaign_id ON public.operational_costs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_operational_costs_cost_date ON public.operational_costs(cost_date DESC);

ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_purchases_admin_all" ON public.material_purchases;
DROP POLICY IF EXISTS "equipment_assets_admin_all" ON public.equipment_assets;
DROP POLICY IF EXISTS "operational_costs_admin_all" ON public.operational_costs;

CREATE POLICY "material_purchases_admin_all"
  ON public.material_purchases
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "equipment_assets_admin_all"
  ON public.equipment_assets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "operational_costs_admin_all"
  ON public.operational_costs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Label system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labels_created_at ON public.labels(created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_labels (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  tagged_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  tagged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_order_labels_order_id ON public.order_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_order_labels_label_id ON public.order_labels(label_id);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "labels_admin_all" ON public.labels;
DROP POLICY IF EXISTS "order_labels_admin_all" ON public.order_labels;

CREATE POLICY "labels_admin_all"
  ON public.labels
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "order_labels_admin_all"
  ON public.order_labels
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
