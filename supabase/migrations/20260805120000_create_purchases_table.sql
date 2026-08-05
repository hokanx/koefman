CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  email text NOT NULL,
  amount_cents integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: this table is only ever read/written by
-- the service-role key inside the stripe-webhook function. Admins can
-- still review purchases via the existing admin-role escape hatch.
CREATE POLICY "Admins can view all purchases" ON public.purchases
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
