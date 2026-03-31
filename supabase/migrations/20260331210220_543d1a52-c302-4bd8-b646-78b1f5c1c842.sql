
-- 1. Extend org_documents with sending/public fields
ALTER TABLE public.org_documents
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

-- 2. Create organization_email_settings
CREATE TABLE public.organization_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sender_name text,
  reply_to_email text,
  logo_url text,
  footer_text text,
  sending_mode text NOT NULL DEFAULT 'shared'
);

ALTER TABLE public.organization_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all org email settings"
  ON public.organization_email_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own org email settings"
  ON public.organization_email_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_memberships.organization_id = organization_email_settings.organization_id
      AND organization_memberships.user_id = auth.uid()
  ));

-- 3. Create org_document_acceptances
CREATE TABLE public.org_document_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  document_id uuid NOT NULL REFERENCES public.org_documents(id) ON DELETE CASCADE,
  accepted_by_name text,
  signature_image text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

ALTER TABLE public.org_document_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all org doc acceptances"
  ON public.org_document_acceptances FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own org doc acceptances"
  ON public.org_document_acceptances FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM org_documents
    JOIN organization_memberships ON organization_memberships.organization_id = org_documents.organization_id
    WHERE org_documents.id = org_document_acceptances.document_id
      AND organization_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Anon can insert acceptance for public documents"
  ON public.org_document_acceptances FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM org_documents
    WHERE org_documents.id = org_document_acceptances.document_id
      AND org_documents.public_token IS NOT NULL
      AND org_documents.status IN ('sent', 'draft')
  ));

-- 4. Create org_document_emails logging table
CREATE TABLE public.org_document_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  document_id uuid NOT NULL REFERENCES public.org_documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by_user_id uuid
);

ALTER TABLE public.org_document_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all org doc emails"
  ON public.org_document_emails FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own org doc emails"
  ON public.org_document_emails FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_memberships.organization_id = org_document_emails.organization_id
      AND organization_memberships.user_id = auth.uid()
  ));

-- 5. Public access RLS for org_documents by token (anon SELECT)
CREATE POLICY "Anon can view org documents by public token"
  ON public.org_documents FOR SELECT TO anon
  USING (public_token IS NOT NULL);

-- 6. Anon can update status for public documents (for acceptance flow)
CREATE POLICY "Anon can update org document status via token"
  ON public.org_documents FOR UPDATE TO anon
  USING (public_token IS NOT NULL AND status IN ('sent', 'draft'))
  WITH CHECK (public_token IS NOT NULL AND status IN ('accepted', 'sent'));

-- 7. updated_at trigger for organization_email_settings
CREATE TRIGGER update_org_email_settings_updated_at
  BEFORE UPDATE ON public.organization_email_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
