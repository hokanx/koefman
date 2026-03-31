import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TemplateType = 'offer' | 'invoice' | 'contract' | 'reminder' | 'expense_export_note' | 'generic_document';

/**
 * Resolves the active template for a given type and organization.
 * Returns the org-specific override if it exists, otherwise the global default.
 */
export const useTemplateResolver = (organizationId: string | null, templateType: TemplateType) => {
  return useQuery({
    queryKey: ['resolved-template', organizationId, templateType],
    queryFn: async () => {
      // Try org-specific first
      if (organizationId) {
        const { data: orgTemplate } = await supabase
          .from('document_templates' as any)
          .select('*')
          .eq('template_type', templateType)
          .eq('scope_type', 'organization')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .maybeSingle();
        if (orgTemplate) return { template: orgTemplate as any, source: 'organization' as const };
      }

      // Fallback to global
      const { data: globalTemplate } = await supabase
        .from('document_templates' as any)
        .select('*')
        .eq('template_type', templateType)
        .eq('scope_type', 'global')
        .is('organization_id', null)
        .eq('is_active', true)
        .maybeSingle();

      return { template: globalTemplate as any ?? null, source: 'global' as const };
    },
    enabled: !!templateType,
  });
};

/**
 * Fetches all templates for a given organization, showing which types
 * have overrides and which fall back to global.
 */
export const useOrgTemplateStatus = (organizationId: string) => {
  return useQuery({
    queryKey: ['org-template-status', organizationId],
    queryFn: async () => {
      const [{ data: orgTemplates }, { data: globalTemplates }] = await Promise.all([
        supabase
          .from('document_templates' as any)
          .select('*')
          .eq('scope_type', 'organization')
          .eq('organization_id', organizationId)
          .order('template_type'),
        supabase
          .from('document_templates' as any)
          .select('*')
          .eq('scope_type', 'global')
          .is('organization_id', null)
          .eq('is_active', true)
          .order('template_type'),
      ]);
      return {
        orgTemplates: (orgTemplates || []) as any[],
        globalTemplates: (globalTemplates || []) as any[],
      };
    },
    enabled: !!organizationId,
  });
};
