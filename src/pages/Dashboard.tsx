import { Users, FileText, Receipt, Plus, ArrowRight, Inbox, Upload, FileArchive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import { formatEUR } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: pendingOffers = 0 } = useQuery({
    queryKey: ['pending-offers'],
    queryFn: async () => {
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('status', ['draft', 'sent']);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: openInvoices = 0 } = useQuery({
    queryKey: ['open-invoices'],
    queryFn: async () => {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('status', ['open', 'draft']);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: unexportedDocs = 0 } = useQuery({
    queryKey: ['unexported-docs'],
    queryFn: async () => {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('status', ['neu', 'hochgeladen']);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ['new-leads-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('intake_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user!.id)
        .eq('status', 'new');
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: recentItems = [] } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const [{ data: offers }, { data: invoices }] = await Promise.all([
        supabase
          .from('offers')
          .select('id, offer_number, status, date, grand_total, customers(name)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('invoices')
          .select('id, invoice_number, status, date, grand_total, customers(name)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);
      const items = [
        ...(offers || []).map((o: any) => ({ ...o, _type: 'offer', _number: o.offer_number })),
        ...(invoices || []).map((i: any) => ({ ...i, _type: 'invoice', _number: i.invoice_number })),
      ];
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return items.slice(0, 5);
    },
    enabled: !!user,
  });

  const statusLabel: Record<string, string> = {
    draft: 'Entwurf', sent: 'Gesendet', accepted: 'Angenommen', rejected: 'Abgelehnt',
    open: 'Offen', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
  };

  const indicators = [
    { label: 'Offene Angebote', count: pendingOffers, onClick: () => navigate('/revenue') },
    { label: 'Offene Rechnungen', count: openInvoices, onClick: () => navigate('/revenue') },
    { label: 'Nicht exportierte Belege', count: unexportedDocs, onClick: () => navigate('/expenses') },
  ].filter(i => i.count > 0);

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-6 mx-auto max-w-2xl">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">ÜBERSICHT</h1>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-auto flex-col gap-2 py-5 text-sm"
          onClick={() => navigate('/offers/new')}
        >
          <FileText className="h-6 w-6" />
          Angebot erstellen
        </Button>
        <Button
          className="h-auto flex-col gap-2 py-5 text-sm"
          onClick={() => navigate('/invoices/new')}
        >
          <Receipt className="h-6 w-6" />
          Rechnung erstellen
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-5 text-sm"
          onClick={() => navigate('/expenses')}
        >
          <Upload className="h-6 w-6" />
          Ausgabe hinzufügen
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-5 text-sm"
          onClick={() => navigate('/tax-export')}
        >
          <FileArchive className="h-6 w-6" />
          Export starten
        </Button>
      </div>

      {/* New Leads Alert */}
      {newLeadsCount > 0 && (
        <button
          onClick={() => navigate('/leads')}
          className="w-full flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">{newLeadsCount} neue Anfragen</span>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </button>
      )}

      {/* Compact indicators */}
      {indicators.length > 0 && (
        <div className="space-y-2">
          {indicators.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/40"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{item.count}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      {recentItems.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Letzte Aktivität</h2>
          <div className="space-y-2">
            {recentItems.map((item: any) => (
              <button
                key={item.id}
                onClick={() => navigate(item._type === 'offer' ? `/offers/${item.id}` : `/invoices/${item.id}`)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {(item.customers as any)?.name || item._number}
                  </p>
                  <p className="text-xs text-muted-foreground">{item._number} · {formatDateDE(item.date)}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-sm font-medium text-foreground">{formatEUR(item.grand_total)}</span>
                  <StatusBadge status={item.status as any} label={statusLabel[item.status] || item.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
