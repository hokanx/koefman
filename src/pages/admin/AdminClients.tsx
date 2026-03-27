import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useNavigate } from 'react-router-dom';
import { formatDateDE } from '@/lib/utils';
import { Users, FileText, Receipt, FolderOpen, Eye, Send, Search } from 'lucide-react';
import { toast } from 'sonner';

const CLIENT_STATUSES = [
  { value: 'aktiv', label: 'Aktiv', color: 'bg-success/15 text-success' },
  { value: 'onboarding', label: 'Onboarding', color: 'bg-info/15 text-info' },
  { value: 'wartet_auf_belege', label: 'Wartet auf Belege', color: 'bg-warning/15 text-warning' },
  { value: 'zahlung_offen', label: 'Zahlung offen', color: 'bg-destructive/15 text-destructive' },
  { value: 'inaktiv', label: 'Inaktiv', color: 'bg-muted text-muted-foreground' },
];

const NOTIFICATION_TEMPLATES = [
  'Bitte laden Sie Ihre Belege hoch.',
  'Ihre Rechnung ist überfällig.',
  'Ihr Vertrag wurde bestätigt.',
  'Bitte vervollständigen Sie Ihr Profil.',
];

const AdminClients = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { startImpersonation } = useImpersonation();
  const [notifyUserId, setNotifyUserId] = useState<string | null>(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('alle');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, account_status, client_status, created_at');

      if (!profiles) return [];

      const { data: settings } = await supabase
        .from('business_settings')
        .select('user_id, business_name, owner_name');

      const { data: customers } = await supabase.from('customers').select('user_id');
      const { data: offers } = await supabase.from('offers').select('user_id');
      const { data: invoices } = await supabase.from('invoices').select('user_id');
      const { data: documents } = await supabase.from('documents').select('user_id, status');

      const countBy = (arr: { user_id: string }[] | null, uid: string) =>
        arr?.filter(r => r.user_id === uid).length ?? 0;

      const newDocCount = (uid: string) =>
        (documents as any[])?.filter(d => d.user_id === uid && d.status === 'neu').length ?? 0;

      return profiles.map(p => {
        const s = settings?.find(s => s.user_id === p.id);
        return {
          ...p,
          businessName: s?.business_name || '–',
          ownerName: s?.owner_name || '–',
          customerCount: countBy(customers, p.id),
          offerCount: countBy(offers, p.id),
          invoiceCount: countBy(invoices, p.id),
          documentCount: countBy(documents, p.id),
          newDocCount: newDocCount(p.id),
        };
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from('profiles').update({ client_status: status }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      toast.success('Status aktualisiert');
    },
  });

  const sendNotification = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        message,
        type: 'admin',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Benachrichtigung gesendet');
      setNotifyUserId(null);
      setNotifyMessage('');
    },
  });

  const handleImpersonate = (client: any) => {
    startImpersonation({
      id: client.id,
      email: client.email || '',
      businessName: client.businessName,
    });
    navigate('/dashboard');
  };

  const getStatusInfo = (status: string) => CLIENT_STATUSES.find(s => s.value === status) || CLIENT_STATUSES[0];

  // Filter and search
  const filtered = clients.filter((c: any) => {
    const matchesSearch = !searchQuery || 
      c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'alle' || c.client_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Kundenübersicht ({clients.length})</h2>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Kunde suchen (Name, Firma, E-Mail)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto">
        {[{ value: 'alle', label: 'Alle' }, ...CLIENT_STATUSES].map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c: any) => {
          const statusInfo = getStatusInfo(c.client_status || 'aktiv');
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-foreground">{c.businessName}</p>
                  <p className="text-sm text-muted-foreground">{c.ownerName}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">Registriert: {formatDateDE(c.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    c.account_status === 'active' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    Konto: {c.account_status === 'active' ? 'Aktiv' : c.account_status === 'pending' ? 'Wartend' : c.account_status}
                  </span>
                </div>
              </div>

              {/* Counts with labels */}
              <div className="grid grid-cols-4 gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Kunden">
                  <Users className="h-3.5 w-3.5" />
                  <span>{c.customerCount} <span className="hidden sm:inline">Kunden</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Angebote">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{c.offerCount} <span className="hidden sm:inline">Angeb.</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Rechnungen">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>{c.invoiceCount} <span className="hidden sm:inline">Rechn.</span></span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${c.newDocCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`} title="Belege">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>
                    {c.documentCount} <span className="hidden sm:inline">Belege</span>
                    {c.newDocCount > 0 && <span className="text-primary"> ({c.newDocCount} neu)</span>}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleImpersonate(c)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Eye className="h-3.5 w-3.5" /> Als Kunde anzeigen
                </button>
                <button
                  onClick={() => { setNotifyUserId(c.id); setNotifyMessage(''); }}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                >
                  <Send className="h-3.5 w-3.5" /> Nachricht
                </button>
                <select
                  value={c.client_status || 'aktiv'}
                  onChange={(e) => updateStatusMutation.mutate({ userId: c.id, status: e.target.value })}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  {CLIENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Notification form */}
              {notifyUserId === c.id && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">Nachricht an {c.businessName}</p>
                  <div className="flex flex-wrap gap-1">
                    {NOTIFICATION_TEMPLATES.map(t => (
                      <button
                        key={t}
                        onClick={() => setNotifyMessage(t)}
                        className="rounded-md bg-background border border-border px-2 py-1 text-[10px] text-foreground hover:bg-accent"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Eigene Nachricht..."
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendNotification.mutate({ userId: c.id, message: notifyMessage })}
                      disabled={!notifyMessage.trim()}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Senden
                    </button>
                    <button
                      onClick={() => setNotifyUserId(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {searchQuery || statusFilter !== 'alle' ? 'Keine Kunden gefunden.' : 'Keine Kunden vorhanden.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminClients;
