import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['business-settings-check', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('id, business_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
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

  const isLoading = loading || (user && (settingsLoading || profileLoading || adminLoading));

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Admins bypass pending/onboarding checks
  if (isAdmin) return <>{children}</>;

  // Check account activation status
  const accountStatus = profile?.account_status ?? 'pending';
  if (accountStatus !== 'active' && location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />;
  }
  if (accountStatus !== 'active') return <>{children}</>;

  // Redirect to onboarding if no settings exist yet
  const needsOnboarding = !settings || !settings.business_name;
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
