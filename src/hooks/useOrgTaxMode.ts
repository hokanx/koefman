import { useWorkspace } from '@/contexts/WorkspaceContext';

/**
 * Returns the tax mode from the active organization (single source of truth).
 * No fallback to user-level business_settings.
 */
export const useOrgTaxMode = () => {
  const { activeOrganization, isLoading } = useWorkspace();

  const taxMode = (activeOrganization as any)?.tax_mode as string | undefined;
  const isKleinunternehmer = taxMode === 'kleinunternehmer';

  return {
    isKleinunternehmer,
    taxMode: isKleinunternehmer ? 'kleinunternehmer' as const : 'standard' as const,
    isLoading,
  };
};
