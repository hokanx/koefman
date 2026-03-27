import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['user-role-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  return { isAdmin: isAdmin ?? false, isLoading };
};

export const useAccountStatus = () => {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('account_status, plan_name, subscription_status')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return {
    accountStatus: profile?.account_status ?? 'pending',
    planName: profile?.plan_name ?? 'free',
    subscriptionStatus: profile?.subscription_status ?? 'trial',
    isLoading,
  };
};
