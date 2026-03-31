
CREATE TABLE public.org_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  booking_date DATE,
  vendor_name TEXT NOT NULL DEFAULT '',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'sonstiges',
  amount_net NUMERIC,
  amount_tax NUMERIC,
  amount_gross NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  receipt_file_url TEXT,
  receipt_file_name TEXT,
  linked_document_id UUID REFERENCES public.org_documents(id) ON DELETE SET NULL,
  notes TEXT,
  export_status TEXT NOT NULL DEFAULT 'open'
);

CREATE TRIGGER update_org_expenses_updated_at
  BEFORE UPDATE ON public.org_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.org_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all org expenses"
  ON public.org_expenses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own org expenses"
  ON public.org_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_expenses.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert own org expenses"
  ON public.org_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_expenses.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update own org expenses"
  ON public.org_expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_expenses.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete own org expenses"
  ON public.org_expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_expenses.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );
