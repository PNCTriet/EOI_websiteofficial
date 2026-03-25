-- Email center: templates, campaigns, logs + RLS for admin

CREATE TABLE IF NOT EXISTS public.email_templates (
  key text PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_key text REFERENCES public.email_templates(key) ON DELETE SET NULL,
  audience text NOT NULL DEFAULT 'all_customers' CHECK (
    audience IN ('all_customers', 'paid_customers', 'custom')
  ),
  custom_recipients text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sending', 'sent', 'failed')
  ),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend',
  provider_message_id text,
  event_type text NOT NULL DEFAULT 'sent',
  status text NOT NULL DEFAULT 'sent' CHECK (
    status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')
  ),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  template_key text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  payload jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_status_idx ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS email_logs_provider_message_id_idx ON public.email_logs (provider_message_id);
CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON public.email_campaigns (status);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_email_logs_updated_at ON public.email_logs;
CREATE TRIGGER trg_email_logs_updated_at
BEFORE UPDATE ON public.email_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_all"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "email_campaigns_admin_all"
  ON public.email_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "email_logs_admin_all"
  ON public.email_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.email_templates (key, name, subject, html, enabled)
VALUES
  (
    'order_paid',
    'Order paid confirmation',
    '[EOI] We got your payment - {{order_ref}}',
    '<h2>Thank you for your order</h2><p>Order: <strong>{{order_ref}}</strong></p><p>Total: <strong>{{order_total}}</strong></p><p>We will update you as soon as your order moves to shipping.</p>',
    true
  ),
  (
    'order_shipped',
    'Order shipped',
    '[EOI] Your order is on the way - {{order_ref}}',
    '<h2>Your order has been shipped</h2><p>Order: <strong>{{order_ref}}</strong></p><p>Carrier: <strong>{{shipping_carrier}}</strong></p><p>Tracking: <strong>{{tracking_number}}</strong></p>',
    true
  ),
  (
    'marketing_broadcast',
    'Marketing broadcast',
    '[EOI] New drop for you',
    '<h2>EOI new collection</h2><p>Hi {{recipient_name}}, check out our newest products.</p><p><a href="{{site_url}}">Visit store</a></p>',
    true
  )
ON CONFLICT (key) DO NOTHING;
