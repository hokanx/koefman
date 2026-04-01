import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the effective tax mode for the current user context.
 * Checks org-level tax_mode first, falls back to business_settings.small_business_regulation.
 */
export const useOrgTaxMode = () => {
  const { user } = useAuth();
  const { organization, isLoading: orgLoading } = useOrganization();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['business-settings-tax', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('small_business_regulation')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Org-level takes priority, then user-level business_settings
  const orgTaxMode = (organization as any)?.tax_mode as string | undefined;
  
  const isKleinunternehmer = orgTaxMode
    ? orgTaxMode === 'kleinunternehmer'
    : !!settings?.small_business_regulation;

  return {
    isKleinunternehmer,
    taxMode: isKleinunternehmer ? 'kleinunternehmer' as const : 'standard' as const,
    isLoading: orgLoading || settingsLoading,
  };
};
