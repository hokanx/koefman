import { useWorkspace } from '@/contexts/WorkspaceContext';

/**
 * Returns the tax mode from the active organization (single source of truth).
 * No fallback to user-level business_settings.
 */
export const useOrgTaxMode = () => {
  const { activeOrganization, isLoading } = useWorkspace();

  const taxMode = activeOrganization?.tax_mode;
  const isKleinunternehmer = taxMode === 'small_business';

  return {
    isKleinunternehmer,
    taxMode: isKleinunternehmer ? 'small_business' as const : 'standard' as const,
    isLoading,
  };
};
