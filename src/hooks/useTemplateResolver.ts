import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type TemplateType = 'offer' | 'invoice' | 'contract' | 'reminder' | 'expense_export_note' | 'generic_document';

type DocumentTemplateRow = Database['public']['Tables']['document_templates']['Row'];

/**
 * Resolves the active template for a given type and organization.
 * Returns the org-specific override if it exists, otherwise the global default.
 */
export const useTemplateResolver = (organizationId: string | null, templateType: TemplateType) => {
  return useQuery({
    queryKey: ['resolved-template', organizationId, templateType],
    queryFn: async () => {
      // Try org-specific first (order by version desc for determinism)
      if (organizationId) {
        const { data: orgTemplates } = await supabase
          .from('document_templates')
          .select('*')
          .eq('template_type', templateType)
          .eq('scope_type', 'organization')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('version_number', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(1);
        const orgTemplate = orgTemplates?.[0];
        if (orgTemplate) {
          if ((orgTemplates?.length ?? 0) > 1) {
            console.warn(`[TemplateResolver] Multiple active org templates for type="${templateType}", org="${organizationId}". Using most recent.`);
          }
          return { template: orgTemplate, source: 'organization' as const };
        }
      }

      // Fallback to global (order by version desc for determinism)
      const { data: globalTemplates } = await supabase
        .from('document_templates')
        .select('*')
        .eq('template_type', templateType)
        .eq('scope_type', 'global')
        .is('organization_id', null)
        .eq('is_active', true)
        .order('version_number', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1);

      if ((globalTemplates?.length ?? 0) > 1) {
        console.warn(`[TemplateResolver] Multiple active global templates for type="${templateType}". Using most recent.`);
      }

      return { template: globalTemplates?.[0] ?? null, source: 'global' as const };
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
          .from('document_templates')
          .select('*')
          .eq('scope_type', 'organization')
          .eq('organization_id', organizationId)
          .order('template_type'),
        supabase
          .from('document_templates')
          .select('*')
          .eq('scope_type', 'global')
          .is('organization_id', null)
          .eq('is_active', true)
          .order('template_type'),
      ]);
      return {
        orgTemplates: (orgTemplates || []) as DocumentTemplateRow[],
        globalTemplates: (globalTemplates || []) as DocumentTemplateRow[],
      };
    },
    enabled: !!organizationId,
  });
};
