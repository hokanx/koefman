
-- Service templates table
CREATE TABLE public.service_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.service_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.service_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.service_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.service_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service template items table
CREATE TABLE public.service_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.service_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Stück',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 19,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template items" ON public.service_template_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.service_templates WHERE service_templates.id = service_template_items.template_id AND service_templates.user_id = auth.uid()));
CREATE POLICY "Users can insert own template items" ON public.service_template_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.service_templates WHERE service_templates.id = service_template_items.template_id AND service_templates.user_id = auth.uid()));
CREATE POLICY "Users can update own template items" ON public.service_template_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.service_templates WHERE service_templates.id = service_template_items.template_id AND service_templates.user_id = auth.uid()));
CREATE POLICY "Users can delete own template items" ON public.service_template_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.service_templates WHERE service_templates.id = service_template_items.template_id AND service_templates.user_id = auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_service_templates_updated_at BEFORE UPDATE ON public.service_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
