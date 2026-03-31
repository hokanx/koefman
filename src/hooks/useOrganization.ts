import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the current user's organization membership(s).
 * For client users: returns their assigned org.
 * For admins: returns null (admins operate globally).
 */
export const useOrganization = () => {
  const { user } = useAuth();

  const { data: membership, isLoading } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('*, organizations(*)')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return {
    organization: membership?.organizations ?? null,
    organizationId: membership?.organization_id ?? null,
    workspaceRole: membership?.role ?? null,
    isLoading,
  };
};
