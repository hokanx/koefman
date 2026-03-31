
-- Organization-scoped generated documents table
CREATE TABLE public.org_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL DEFAULT 'offer',
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT '',
  document_number TEXT,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  template_snapshot_json JSONB DEFAULT '{}'::jsonb,
  document_payload_json JSONB DEFAULT '{}'::jsonb,
  rendered_content_json JSONB,
  rendered_html TEXT,
  notes TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  amount_total NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR'
);

-- Auto-update updated_at
CREATE TRIGGER update_org_documents_updated_at
  BEFORE UPDATE ON public.org_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.org_documents ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all org documents"
  ON public.org_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Org members can view their org's documents
CREATE POLICY "Members can view own org documents"
  ON public.org_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_documents.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

-- Org members can insert documents in their org
CREATE POLICY "Members can insert own org documents"
  ON public.org_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_documents.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

-- Org members can update documents in their org
CREATE POLICY "Members can update own org documents"
  ON public.org_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_documents.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );

-- Org members can delete documents in their org
CREATE POLICY "Members can delete own org documents"
  ON public.org_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = org_documents.organization_id
        AND organization_memberships.user_id = auth.uid()
    )
  );
