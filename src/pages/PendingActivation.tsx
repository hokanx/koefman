import { Clock, LogOut, ShieldX, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const statusConfig: Record<string, { icon: React.ReactNode; title: string; description: string; detail: string }> = {
  pending: {
    icon: <Clock className="h-10 w-10 text-warning" />,
    title: 'Registrierung erfolgreich',
    description: 'Ihr Konto wartet auf Freischaltung.',
    detail: 'Vielen Dank für Ihre Registrierung. Ihr Konto wird in Kürze von einem Administrator freigeschaltet. Sie erhalten Zugriff, sobald Ihr Konto aktiviert wurde.',
  },
  suspended: {
    icon: <ShieldX className="h-10 w-10 text-destructive" />,
    title: 'Konto gesperrt',
    description: 'Dein Konto wurde vorübergehend gesperrt.',
    detail: 'Der Zugriff auf Ihr Konto wurde vorübergehend eingeschränkt. Bitte kontaktieren Sie den Support für weitere Informationen.',
  },
  cancelled: {
    icon: <Ban className="h-10 w-10 text-destructive" />,
    title: 'Zugriff verweigert',
    description: 'Der Zugriff wurde verweigert.',
    detail: 'Ihr Konto wurde deaktiviert. Bei Fragen wenden Sie sich bitte an den Support.',
  },
};

const PendingActivation = () => {
  const { user, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile-status-page', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const status = profile?.account_status ?? 'pending';
  const config = statusConfig[status] || statusConfig.pending;
  const iconBg = status === 'pending' ? 'bg-warning/10' : 'bg-destructive/10';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconBg}`}>
          {config.icon}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left">
          <p className="text-sm text-muted-foreground">{config.detail}</p>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </div>
  );
};

export default PendingActivation;
