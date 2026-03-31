
-- Document templates table
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  template_type text NOT NULL DEFAULT 'generic_document',
  scope_type text NOT NULL DEFAULT 'global',
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  content_json jsonb DEFAULT '{}'::jsonb,
  content_html text,
  content_text text,
  version_number integer NOT NULL DEFAULT 1,
  notes text,
  created_by_user_id uuid,
  updated_by_user_id uuid,

  -- Ensure global templates have no org, org templates require one
  CONSTRAINT valid_scope CHECK (
    (scope_type = 'global' AND organization_id IS NULL) OR
    (scope_type = 'organization' AND organization_id IS NOT NULL)
  ),

  -- Only one active template per type per scope (global or per-org)
  CONSTRAINT unique_active_global UNIQUE (template_type, scope_type, organization_id, is_active)
);

-- Index for resolver lookups
CREATE INDEX idx_doc_templates_resolve ON public.document_templates (template_type, is_active, scope_type, organization_id);

-- Updated_at trigger
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all document templates"
  ON public.document_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Org members can view global templates
CREATE POLICY "Authenticated can view active global templates"
  ON public.document_templates FOR SELECT TO authenticated
  USING (scope_type = 'global' AND is_active = true);

-- Org members can view their org's templates
CREATE POLICY "Members can view own org templates"
  ON public.document_templates FOR SELECT TO authenticated
  USING (
    scope_type = 'organization' AND
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = document_templates.organization_id
      AND organization_memberships.user_id = auth.uid()
    )
  );
