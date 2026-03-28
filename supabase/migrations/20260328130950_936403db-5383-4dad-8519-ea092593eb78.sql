CREATE TABLE public.period_completeness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_key text NOT NULL,
  no_activity boolean NOT NULL DEFAULT false,
  admin_override boolean NOT NULL DEFAULT false,
  admin_override_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_key)
);

ALTER TABLE public.period_completeness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own period completeness" ON public.period_completeness
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own period completeness" ON public.period_completeness
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own period completeness" ON public.period_completeness
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all period completeness" ON public.period_completeness
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all period completeness" ON public.period_completeness
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert period completeness" ON public.period_completeness
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));