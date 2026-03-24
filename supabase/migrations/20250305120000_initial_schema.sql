-- Schema aligned with src/types/database.ts
-- Run in Supabase: SQL Editor → New query → paste → Run
-- Or: supabase db push (if linked)

-- Enum: OrderStage (matches Database["public"]["Enums"]["order_stage"])
CREATE TYPE public.order_stage AS ENUM (
  'pending_payment',
  'paid',
  'processing',
  'printing',
  'shipped',
  'delivered',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  material text,
  category text,
  image_urls jsonb,
  stl_url text,
  is_active boolean NOT NULL DEFAULT true,
  colors jsonb,
  accent_bg text,
  badge text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX products_is_active_idx ON public.products (is_active);
CREATE INDEX products_created_at_idx ON public.products (created_at DESC);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customers_email_idx ON public.customers (email);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sepay_ref text,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  stage public.order_stage NOT NULL DEFAULT 'pending_payment',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_customer_id_idx ON public.orders (customer_id);
CREATE INDEX orders_stage_idx ON public.orders (stage);
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  product_name_snapshot text
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX order_items_product_id_idx ON public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- order_stage_logs
-- ---------------------------------------------------------------------------
CREATE TABLE public.order_stage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  from_stage public.order_stage,
  to_stage public.order_stage NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_stage_logs_order_id_idx ON public.order_stage_logs (order_id);

-- ---------------------------------------------------------------------------
-- sepay_logs
-- ---------------------------------------------------------------------------
CREATE TABLE public.sepay_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_payload jsonb NOT NULL,
  amount integer,
  matched boolean NOT NULL DEFAULT false,
  order_id uuid REFERENCES public.orders (id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sepay_logs_order_id_idx ON public.sepay_logs (order_id);
CREATE INDEX sepay_logs_matched_idx ON public.sepay_logs (matched);

-- ---------------------------------------------------------------------------
-- updated_at trigger (products)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Chỉnh lại policy nếu bạn dùng role/email khác cho admin.
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sepay_logs ENABLE ROW LEVEL SECURITY;

-- Storefront: ai cũng đọc được sản phẩm đang bật
CREATE POLICY "products_public_read_active"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin (user đã đăng nhập Supabase Auth): full CRUD mọi bảng
CREATE POLICY "products_authenticated_all"
  ON public.products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "customers_authenticated_all"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "orders_authenticated_all"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "order_items_authenticated_all"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "order_stage_logs_authenticated_all"
  ON public.order_stage_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Webhook Sepay: dùng SUPABASE_SERVICE_ROLE_KEY trên server → bypass RLS.
-- Không mở policy anon cho sepay_logs.
CREATE POLICY "sepay_logs_authenticated_all"
  ON public.sepay_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
