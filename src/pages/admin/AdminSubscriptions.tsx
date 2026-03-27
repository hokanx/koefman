import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateDE } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

const subStatusLabels: Record<string, string> = {
  trial: 'Testphase',
  active: 'Aktiv',
  paused: 'Pausiert',
  past_due: 'Überfällig',
  cancelled: 'Gekündigt',
};

const subStatusColors: Record<string, string> = {
  trial: 'bg-info/15 text-info',
  active: 'bg-success/15 text-success',
  paused: 'bg-warning/15 text-warning',
  past_due: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

const AdminSubscriptions = () => {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, plan_name, subscription_status, subscription_start, subscription_end, trial_end, created_at')
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

  const updateSub = useMutation({
    mutationFn: async ({ userId, plan_name, subscription_status }: { userId: string; plan_name: string; subscription_status: string }) => {
      const updates: Record<string, unknown> = { plan_name, subscription_status };
      if (subscription_status === 'active' && !users?.find(u => u.id === userId)?.subscription_start) {
        updates.subscription_start = new Date().toISOString();
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setEditingId(null);
      toast.success('Abonnement aktualisiert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Abonnements</h2>

      <div className="space-y-3">
        {users?.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{u.business_name}</p>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              </div>
              <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${subStatusColors[u.subscription_status] || subStatusColors.trial}`}>
                {subStatusLabels[u.subscription_status] || u.subscription_status}
              </span>
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Plan: <span className="font-medium text-foreground">{u.plan_name || 'free'}</span></p>
              {u.subscription_start && <p>Start: {formatDateDE(u.subscription_start)}</p>}
              {u.subscription_end && <p>Ende: {formatDateDE(u.subscription_end)}</p>}
              {u.trial_end && <p>Testphase bis: {formatDateDE(u.trial_end)}</p>}
            </div>

            {editingId === u.id ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div>
                  <label className="text-xs text-muted-foreground">Plan</label>
                  <input
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                    placeholder="z.B. starter, pro, enterprise"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  >
                    {Object.entries(subStatusLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSub.mutate({ userId: u.id, plan_name: editPlan, subscription_status: editStatus })}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setEditingId(u.id); setEditPlan(u.plan_name || 'free'); setEditStatus(u.subscription_status || 'trial'); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Bearbeiten
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSubscriptions;
