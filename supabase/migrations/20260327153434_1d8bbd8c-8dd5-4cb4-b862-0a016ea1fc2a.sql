
CREATE TABLE public.landing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT 'general',
  situation text NOT NULL DEFAULT '',
  needs text[] NOT NULL DEFAULT '{}',
  contact_method text NOT NULL DEFAULT 'email',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  status text NOT NULL DEFAULT 'neu',
  admin_notes text DEFAULT '',
  converted_customer_id uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all landing leads" ON public.landing_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert landing leads" ON public.landing_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
