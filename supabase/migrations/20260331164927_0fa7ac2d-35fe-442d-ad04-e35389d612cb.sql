
-- Partial unique index: at most one active global template per template_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_global_template
  ON public.document_templates (template_type)
  WHERE scope_type = 'global' AND organization_id IS NULL AND is_active = true;

-- Partial unique index: at most one active org override per organization_id + template_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_org_template
  ON public.document_templates (organization_id, template_type)
  WHERE scope_type = 'organization' AND is_active = true;
