import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, CheckCircle, Clock, ShieldX, Ban, Building2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type StatusFilter = 'alle' | 'pending' | 'active' | 'suspended' | 'cancelled';

interface ProfileRow {
  id: string;
  email: string | null;
  account_status: string;
  created_at: string;
  admin_notes: string | null;
}

interface OrgMembershipRow {
  user_id: string;
  organizations: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: 'Ausstehend', icon: <Clock className="h-3.5 w-3.5" />, className: 'bg-warning/10 text-warning border-warning/30' },
  active: { label: 'Aktiv', icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  suspended: { label: 'Gesperrt', icon: <ShieldX className="h-3.5 w-3.5" />, className: 'bg-destructive/10 text-destructive border-destructive/30' },
  cancelled: { label: 'Deaktiviert', icon: <Ban className="h-3.5 w-3.5" />, className: 'bg-muted text-muted-foreground border-border' },
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'pending', label: 'Ausstehend' },
  { key: 'active', label: 'Aktiv' },
  { key: 'suspended', label: 'Gesperrt' },
];

const AdminAccounts = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ profileId: string; newStatus: string; email: string } | null>(null);

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles', filter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, email, account_status, created_at, admin_notes')
        .order('created_at', { ascending: false });

      if (filter !== 'alle') {
        query = query.eq('account_status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  // Fetch business_settings to show onboarding status
  const profileIds = profiles.map(p => p.id);
  const { data: settingsMap = {} } = useQuery({
    queryKey: ['admin-business-settings-check', profileIds],
    queryFn: async () => {
      if (profileIds.length === 0) return {};
      const { data } = await supabase
        .from('business_settings')
        .select('user_id, business_name')
        .in('user_id', profileIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach(s => { map[s.user_id] = s.business_name || ''; });
      return map;
    },
    enabled: profileIds.length > 0,
  });

  // Fetch org memberships
  const { data: orgMap = {} } = useQuery({
    queryKey: ['admin-org-check', profileIds],
    queryFn: async () => {
      if (profileIds.length === 0) return {};
      const { data } = await supabase
        .from('organization_memberships')
        .select('user_id, organizations(name)')
        .in('user_id', profileIds)
        .returns<OrgMembershipRow[]>();
      const map: Record<string, string> = {};
      (data ?? []).forEach((m) => { map[m.user_id] = m.organizations?.name || ''; });
      return map;
    },
    enabled: profileIds.length > 0,
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ profileId, newStatus }: { profileId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: newStatus })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Kontostatus aktualisiert');
      setConfirmAction(null);
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren');
      setConfirmAction(null);
    },
  });

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.email?.toLowerCase().includes(q)) ||
      (settingsMap[p.id]?.toLowerCase().includes(q)) ||
      (orgMap[p.id]?.toLowerCase().includes(q));
  });

  const getActions = (profile: ProfileRow) => {
    const actions: { label: string; status: string; variant: 'default' | 'destructive' | 'outline' }[] = [];
    if (profile.account_status !== 'active') {
      actions.push({ label: 'Aktivieren', status: 'active', variant: 'default' });
    }
    if (profile.account_status === 'active') {
      actions.push({ label: 'Sperren', status: 'suspended', variant: 'destructive' });
    }
    if (profile.account_status === 'suspended') {
      actions.push({ label: 'Deaktivieren', status: 'cancelled', variant: 'outline' });
    }
    return actions;
  };

  const confirmLabel = confirmAction?.newStatus === 'active' ? 'Aktivieren'
    : confirmAction?.newStatus === 'suspended' ? 'Sperren'
    : 'Deaktivieren';

  const confirmDescription = confirmAction?.newStatus === 'active'
    ? `${confirmAction.email} wird freigeschaltet und kann sich anmelden.`
    : confirmAction?.newStatus === 'suspended'
    ? `${confirmAction.email} wird gesperrt und kann nicht mehr auf das System zugreifen.`
    : `${confirmAction?.email} wird dauerhaft deaktiviert.`;

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-bold text-foreground">Konten</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <UserCheck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Keine Konten gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(profile => {
            const status = STATUS_CONFIG[profile.account_status] || STATUS_CONFIG.pending;
            const businessName = settingsMap[profile.id];
            const orgName = orgMap[profile.id];
            const actions = getActions(profile);

            return (
              <div key={profile.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {profile.email || '–'}
                      </span>
                      <Badge variant="outline" className={cn('text-xs gap-1', status.className)}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        Registriert: {format(new Date(profile.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </span>
                      {businessName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {businessName}
                        </span>
                      )}
                      {orgName && !businessName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {orgName}
                        </span>
                      )}
                    </div>

                    {/* Onboarding indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {businessName ? (
                        <span className="text-green-600">✓ Onboarding abgeschlossen</span>
                      ) : (
                        <span className="text-muted-foreground">○ Onboarding ausstehend</span>
                      )}
                      {orgName && (
                        <span className="text-green-600">✓ Organisation</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {actions.map(action => (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.variant}
                        onClick={() => setConfirmAction({
                          profileId: profile.id,
                          newStatus: action.status,
                          email: profile.email || '–',
                        })}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Status ändern: {confirmLabel}?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  statusMutation.mutate({
                    profileId: confirmAction.profileId,
                    newStatus: confirmAction.newStatus,
                  });
                }
              }}
              className={confirmAction?.newStatus !== 'active' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAccounts;
