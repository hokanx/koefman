
CREATE TABLE public.organization_commercials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  setup_fee_default numeric NOT NULL DEFAULT 699,
  monthly_fee_default numeric NOT NULL DEFAULT 399,
  discount_type text DEFAULT NULL,
  discount_value numeric DEFAULT 0,
  final_setup_fee numeric NOT NULL DEFAULT 699,
  final_monthly_fee numeric NOT NULL DEFAULT 399,
  contract_duration_months integer NOT NULL DEFAULT 12,
  contract_start_date date DEFAULT NULL,
  contract_end_date date DEFAULT NULL,
  commercial_status text NOT NULL DEFAULT 'lead',
  notes text DEFAULT NULL,
  CONSTRAINT organization_commercials_organization_id_key UNIQUE (organization_id),
  CONSTRAINT discount_type_check CHECK (discount_type IS NULL OR discount_type IN ('percent', 'fixed')),
  CONSTRAINT commercial_status_check CHECK (commercial_status IN ('lead', 'offer_sent', 'active_client', 'paused', 'cancelled'))
);

ALTER TABLE public.organization_commercials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all organization commercials"
  ON public.organization_commercials FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own org commercials"
  ON public.organization_commercials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = organization_commercials.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_organization_commercials_updated_at
  BEFORE UPDATE ON public.organization_commercials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
