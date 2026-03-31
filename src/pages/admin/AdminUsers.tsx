import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateDE } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, X, Pause, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusLabels: Record<string, string> = {
  pending: 'Wartend',
  active: 'Aktiv',
  suspended: 'Gesperrt',
  cancelled: 'Gekündigt',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  active: 'bg-success/15 text-success',
  suspended: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

const actionLabels: Record<string, string> = {
  active: 'Freischalten',
  suspended: 'Sperren',
  cancelled: 'Kündigen',
};

const actionDescriptions: Record<string, string> = {
  active: 'Der Benutzer erhält vollen Zugriff auf die Plattform.',
  suspended: 'Der Benutzer wird vorübergehend gesperrt und kann nicht auf die Plattform zugreifen.',
  cancelled: 'Der Benutzer wird dauerhaft deaktiviert und verliert den Zugriff.',
};

const AdminUsers = () => {
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{ userId: string; status: string; email: string } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, account_status, plan_name, subscription_status, created_at')
        .order('created_at', { ascending: false });

      if (!profiles) return [];

      const { data: settings } = await supabase
        .from('business_settings')
        .select('user_id, business_name');

      const settingsMap = new Map(settings?.map(s => [s.user_id, s.business_name]) ?? []);

      return profiles.map(p => ({
        ...p,
        business_name: settingsMap.get(p.id) || '–',
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: status })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Status aktualisiert');
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren');
      setConfirmAction(null);
    },
  });

  const requestChange = (userId: string, status: string, email: string) => {
    setConfirmAction({ userId, status, email });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Benutzer</h2>

      <div className="space-y-3">
        {users?.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{u.business_name}</p>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registriert: {formatDateDE(u.created_at)}
                </p>
              </div>
              <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[u.account_status] || statusColors.pending}`}>
                {statusLabels[u.account_status] || u.account_status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {u.account_status === 'pending' && (
                <button
                  onClick={() => requestChange(u.id, 'active', u.email || '')}
                  className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" /> Freischalten
                </button>
              )}
              {u.account_status === 'active' && (
                <button
                  onClick={() => requestChange(u.id, 'suspended', u.email || '')}
                  className="inline-flex items-center gap-1 rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/20 transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" /> Sperren
                </button>
              )}
              {(u.account_status === 'suspended' || u.account_status === 'cancelled') && (
                <button
                  onClick={() => requestChange(u.id, 'active', u.email || '')}
                  className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reaktivieren
                </button>
              )}
              {u.account_status !== 'cancelled' && u.account_status !== 'pending' && (
                <button
                  onClick={() => requestChange(u.id, 'cancelled', u.email || '')}
                  className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Kündigen
                </button>
              )}
            </div>
          </div>
        ))}

        {users?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Keine Benutzer vorhanden.</p>
        )}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Status ändern: {confirmAction ? actionLabels[confirmAction.status] || confirmAction.status : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block mb-2">
                Benutzer: <strong>{confirmAction?.email}</strong>
              </span>
              {confirmAction ? actionDescriptions[confirmAction.status] || '' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  updateStatus.mutate({ userId: confirmAction.userId, status: confirmAction.status });
                }
              }}
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
