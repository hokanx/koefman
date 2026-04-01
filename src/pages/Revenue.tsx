import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Receipt, ScrollText, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SearchBar from '@/components/shared/SearchBar';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import { formatEUR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';

type Tab = 'offers' | 'invoices' | 'contracts';

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'offers', label: 'Angebote', icon: FileText },
  { key: 'invoices', label: 'Rechnungen', icon: Receipt },
  { key: 'contracts', label: 'Verträge', icon: ScrollText },
];

const Revenue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isKleinunternehmer } = useOrgTaxMode();
  const [tab, setTab] = useState<Tab>('offers');
  const [search, setSearch] = useState('');

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['revenue-offers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('id, offer_number, status, date, grand_total, customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
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
      return data || [];
    },
    enabled: !!user,
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['revenue-contracts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id, contract_number, status, start_date, grand_total, title, customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const openOffers = offers.filter((o: any) => o.status === 'sent' || o.status === 'draft').length;
  const openInvoices = invoices.filter((i: any) => i.status === 'open' || i.status === 'draft').length;
  const totalPaid = invoices
    .filter((i: any) => i.status === 'paid')
    .reduce((sum: number, i: any) => sum + Number(i.grand_total), 0);

  const isLoading = tab === 'offers' ? loadingOffers : tab === 'invoices' ? loadingInvoices : loadingContracts;

  const filterBySearch = (items: any[], fields: string[]) => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((item) =>
      fields.some((f) => {
        const val = f.includes('.') ? item[f.split('.')[0]]?.[f.split('.')[1]] : item[f];
        return val?.toString().toLowerCase().includes(s);
      })
    );
  };

  const statusLabel: Record<string, string> = {
    draft: 'Entwurf',
    sent: 'Gesendet',
    accepted: 'Angenommen',
    rejected: 'Abgelehnt',
    open: 'Offen',
    paid: 'Bezahlt',
    overdue: 'Überfällig',
    cancelled: 'Storniert',
    active: 'Aktiv',
    paused: 'Pausiert',
    ended: 'Beendet',
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">EINNAHMEN</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/offers/new')}>
            <Plus className="mr-1 h-4 w-4" /> Angebot
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/invoices/new')}>
            <Plus className="mr-1 h-4 w-4" /> Rechnung
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{openOffers}</p>
          <p className="text-xs text-muted-foreground">Offene Angebote</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{openInvoices}</p>
          <p className="text-xs text-muted-foreground">Offene Rechnungen</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-success">{formatEUR(totalPaid)}</p>
          <p className="text-xs text-muted-foreground">{isKleinunternehmer ? 'Erhalten' : 'Bezahlt (brutto)'}</p>
        </div>
      </div>

      {isKleinunternehmer && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <span>§19 UStG – Keine Umsatzsteuer wird berechnet.</span>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(''); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} placeholder="Suchen…" />

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tab === 'offers' ? (
        filterBySearch(offers, ['offer_number', 'customers.name']).length === 0 ? (
          <EmptyState icon={FileText} title="Keine Angebote" description="Erstellen Sie Ihr erstes Angebot." />
        ) : (
          <div className="space-y-2">
            {filterBySearch(offers, ['offer_number', 'customers.name']).map((offer: any) => (
              <Link
                key={offer.id}
                to={`/offers/${offer.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{(offer.customers as any)?.name || offer.offer_number}</p>
                  <p className="text-xs text-muted-foreground">{offer.offer_number} · {formatDateDE(offer.date)}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className="font-medium text-foreground">{formatEUR(offer.grand_total)}</span>
                  <StatusBadge status={offer.status} label={statusLabel[offer.status] || offer.status} />
                </div>
              </Link>
            ))}
          </div>
        )
      ) : tab === 'invoices' ? (
        filterBySearch(invoices, ['invoice_number', 'customers.name']).length === 0 ? (
          <EmptyState icon={Receipt} title="Keine Rechnungen" description="Erstellen Sie Ihre erste Rechnung." />
        ) : (
          <div className="space-y-2">
            {filterBySearch(invoices, ['invoice_number', 'customers.name']).map((inv: any) => {
              const isOverdue = inv.status === 'open' && inv.due_date && new Date(inv.due_date) < new Date();
              const displayStatus = isOverdue ? 'overdue' : inv.status;
              return (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{(inv.customers as any)?.name || inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number} · {formatDateDE(inv.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className="font-medium text-foreground">{formatEUR(inv.grand_total)}</span>
                    <StatusBadge status={displayStatus as any} label={statusLabel[displayStatus] || displayStatus} />
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        filterBySearch(contracts, ['contract_number', 'title', 'customers.name']).length === 0 ? (
          <EmptyState icon={ScrollText} title="Keine Verträge" description="Verträge werden aus Angeboten erstellt." />
        ) : (
          <div className="space-y-2">
            {filterBySearch(contracts, ['contract_number', 'title', 'customers.name']).map((c: any) => (
              <Link
                key={c.id}
                to={`/contracts`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{c.title || (c.customers as any)?.name}</p>
                  <p className="text-xs text-muted-foreground">{c.contract_number} · {formatDateDE(c.start_date)}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className="font-medium text-foreground">{formatEUR(c.grand_total)}</span>
                  <StatusBadge status={c.status} label={statusLabel[c.status] || c.status} />
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Revenue;
