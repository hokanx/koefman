
-- Add admin_notes and client_tags to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_tags text[] DEFAULT '{}';

-- Create global_service_templates table (admin-managed, per industry)
CREATE TABLE public.global_service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry text NOT NULL DEFAULT 'general',
  template_name text NOT NULL,
  description text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.global_service_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.global_service_templates(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 19,
  total numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'Stück',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for global templates (admin-only write, all authenticated can read)
ALTER TABLE public.global_service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_service_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage global templates" ON public.global_service_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view global templates" ON public.global_service_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage global template items" ON public.global_service_template_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view global template items" ON public.global_service_template_items FOR SELECT TO authenticated USING (true);
