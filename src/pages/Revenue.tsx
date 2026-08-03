import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Receipt, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import { formatEUR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';
import type { Tables } from '@/integrations/supabase/types';
import type { StatusBadgeProps } from '@/components/shared/StatusBadge';

type Tab = 'offers' | 'invoices';

type OfferListItem = Pick<Tables<'offers'>, 'id' | 'offer_number' | 'status' | 'date' | 'grand_total'> & {
  customers: Pick<Tables<'customers'>, 'name'> | null;
};

type InvoiceListItem = Pick<Tables<'invoices'>, 'id' | 'invoice_number' | 'status' | 'date' | 'due_date' | 'grand_total'> & {
  customers: Pick<Tables<'customers'>, 'name'> | null;
};

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'offers', label: 'Angebote', icon: FileText },
  { key: 'invoices', label: 'Rechnungen', icon: Receipt },
];

const statusLabel: Record<string, string> = {
  draft: 'Entwurf', sent: 'Gesendet', accepted: 'Angenommen', rejected: 'Abgelehnt',
  open: 'Offen', paid: 'Bezahlt', overdue: 'Überfällig', cancelled: 'Storniert',
  active: 'Aktiv', paused: 'Pausiert', ended: 'Beendet',
};

const Revenue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isKleinunternehmer } = useOrgTaxMode();
  const [tab, setTab] = useState<Tab>('offers');

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['revenue-offers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('id, offer_number, status, date, grand_total, customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data || []) as OfferListItem[];
    },
    enabled: !!user,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['revenue-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, date, due_date, grand_total, customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data || []) as InvoiceListItem[];
    },
    enabled: !!user,
  });


  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.grand_total), 0);

  const isLoading = tab === 'offers' ? loadingOffers : loadingInvoices;

  const renderList = () => {
    if (tab === 'offers') {
      if (offers.length === 0) return <EmptyState icon={FileText} title="Erstes Angebot erstellen" description="Erstellen Sie Ihr erstes Angebot." />;
      return offers.map((o) => (
        <Link key={o.id} to={`/offers/${o.id}`} state={{ from: '/revenue' }} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">{o.customers?.name || o.offer_number}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{o.offer_number} · {formatDateDE(o.date)}</p>
          </div>
          <div className="flex items-center gap-3 ml-3 shrink-0">
            <span className="font-medium text-foreground">{formatEUR(o.grand_total)}</span>
            <StatusBadge status={o.status as StatusBadgeProps['status']} label={statusLabel[o.status] || o.status} />
          </div>
        </Link>
      ));
    }

    if (tab === 'invoices') {
      if (invoices.length === 0) return <EmptyState icon={Receipt} title="Erste Rechnung erstellen" description="Erstellen Sie Ihre erste Rechnung." />;
      return invoices.map((inv) => {
        const isOverdue = inv.status === 'open' && inv.due_date && new Date(inv.due_date) < new Date();
        const displayStatus = isOverdue ? 'overdue' : inv.status;
        return (
          <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{inv.customers?.name || inv.invoice_number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{inv.invoice_number} · {formatDateDE(inv.date)}</p>
            </div>
            <div className="flex items-center gap-3 ml-3 shrink-0">
              <span className="font-medium text-foreground">{formatEUR(inv.grand_total)}</span>
              <StatusBadge status={displayStatus as StatusBadgeProps['status']} label={statusLabel[displayStatus] || displayStatus} />
            </div>
          </Link>
        );
      });
    }

    return null;
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-5">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">EINNAHMEN</h1>

      {/* KPI */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Einnahmen gesamt</p>
        <p className="text-3xl font-bold text-foreground mt-1">{formatEUR(totalPaid)}</p>
      </div>

      {isKleinunternehmer && (
        <p className="text-xs text-muted-foreground">§19 UStG – Keine Umsatzsteuer wird berechnet.</p>
      )}

      {/* CTAs */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => navigate('/invoices/new')}>
          <Plus className="mr-1 h-4 w-4" /> Rechnung erstellen
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => navigate('/offers/new')}>
          <Plus className="mr-1 h-4 w-4" /> Angebot
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">{renderList()}</div>
      )}
    </div>
  );
};

export default Revenue;
