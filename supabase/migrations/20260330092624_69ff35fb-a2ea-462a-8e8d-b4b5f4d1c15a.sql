CREATE TABLE public.strategy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  main_problem text DEFAULT '',
  source text DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert strategy requests"
  ON public.strategy_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage strategy requests"
  ON public.strategy_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));