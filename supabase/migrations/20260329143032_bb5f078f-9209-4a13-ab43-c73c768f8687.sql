
CREATE TABLE public.diagnostic_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  company text,
  business_type text NOT NULL DEFAULT '',
  lead_flow text NOT NULL DEFAULT '',
  revenue_clarity text NOT NULL DEFAULT '',
  main_problem text NOT NULL DEFAULT '',
  variant text,
  qr_session_id uuid
);

ALTER TABLE public.diagnostic_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert diagnostic submissions"
  ON public.diagnostic_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view all diagnostic submissions"
  ON public.diagnostic_submissions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update diagnostic submissions"
  ON public.diagnostic_submissions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.lead_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  submission_id uuid NOT NULL REFERENCES public.diagnostic_submissions(id) ON DELETE CASCADE,
  analysis_status text NOT NULL DEFAULT 'pending',
  headline text NOT NULL DEFAULT '',
  main_issue text NOT NULL DEFAULT '',
  practical_meaning text NOT NULL DEFAULT '',
  priority_1 text NOT NULL DEFAULT '',
  priority_2 text NOT NULL DEFAULT '',
  priority_3 text NOT NULL DEFAULT '',
  next_step text NOT NULL DEFAULT '',
  full_analysis_json jsonb,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz
);

ALTER TABLE public.lead_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all lead analyses"
  ON public.lead_analyses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
