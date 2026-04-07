import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight } from 'lucide-react';
import { formatEUR } from '@/lib/utils';
import { formatDateDE } from '@/lib/generatePdf';
import { getStatusLabel, getStatusColor } from '@/lib/adminDocumentStatus';

type DocTab = 'all' | 'offers' | 'invoices' | 'contracts';

interface UnifiedDoc {
  id: string;
  type: 'offer' | 'invoice' | 'contract';
  number: string;
  customerName: string;
  ownerName: string;
  amount: number;
  status: string;
  date: string;
}

const AdminDocumentsUnified = () => {
  const [tab, setTab] = useState<DocTab>('all');
  const [search, setSearch] = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['admin-unified-docs'],
    queryFn: async () => {
      const [offersRes, invoicesRes, contractsRes] = await Promise.all([
        supabase.from('offers').select('id, offer_number, grand_total, status, date, user_id, customer:customers(name)'),
        supabase.from('invoices').select('id, invoice_number, grand_total, status, date, user_id, customer:customers(name)'),
        supabase.from('contracts').select('id, contract_number, grand_total, status, start_date, user_id, customer:customers(name)'),
      ]);

      // Collect unique user_ids to fetch owner names
      const userIds = new Set<string>();
      [offersRes.data, invoicesRes.data, contractsRes.data].forEach(arr =>
        (arr || []).forEach((d: any) => { if (d.user_id) userIds.add(d.user_id); })
      );

      // Fetch owner business names
      const ownerMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: settings } = await supabase
          .from('business_settings')
          .select('user_id, business_name, owner_name')
          .in('user_id', Array.from(userIds));
        (settings || []).forEach((s: any) => {
          ownerMap[s.user_id] = s.business_name || s.owner_name || '–';
        });
      }

      const unified: UnifiedDoc[] = [];

      (offersRes.data || []).forEach((o: any) => unified.push({
        id: o.id, type: 'offer', number: o.offer_number,
        customerName: o.customer?.name || '–', amount: o.grand_total,
        ownerName: ownerMap[o.user_id] || '–',
        status: o.status, date: o.date,
      }));

      (invoicesRes.data || []).forEach((i: any) => unified.push({
        id: i.id, type: 'invoice', number: i.invoice_number,
        customerName: i.customer?.name || '–', amount: i.grand_total,
        ownerName: ownerMap[i.user_id] || '–',
        status: i.status, date: i.date,
      }));

      (contractsRes.data || []).forEach((c: any) => unified.push({
        id: c.id, type: 'contract', number: c.contract_number,
        customerName: c.customer?.name || '–', amount: c.grand_total,
        ownerName: ownerMap[c.user_id] || '–',
        status: c.status, date: c.start_date,
      }));

      return unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });

  const typeLabel: Record<string, string> = { offer: 'Angebot', invoice: 'Rechnung', contract: 'Vertrag' };

  const filtered = docs.filter(d => {
    if (tab !== 'all' && d.type !== tab.replace(/s$/, '')) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.number.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q) || d.ownerName.toLowerCase().includes(q);
    }
    return true;
  });

  // Tab counts
  const counts = {
    all: docs.length,
    offers: docs.filter(d => d.type === 'offer').length,
    invoices: docs.filter(d => d.type === 'invoice').length,
    contracts: docs.filter(d => d.type === 'contract').length,
  };

  const tabs: { key: DocTab; label: string }[] = [
    { key: 'all', label: `Alle (${counts.all})` },
    { key: 'offers', label: `Angebote (${counts.offers})` },
    { key: 'invoices', label: `Rechnungen (${counts.invoices})` },
    { key: 'contracts', label: `Verträge (${counts.contracts})` },
  ];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Dokumente</h2>
        <Badge variant="secondary">{filtered.length}</Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === t.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Nummer, Kunde oder Inhaber suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border border-foreground border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Keine Dokumente gefunden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <a key={`${doc.type}-${doc.id}`} href={`/admin/documents/${doc.type}/${doc.id}`}
              className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors block">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs text-muted-foreground">{typeLabel[doc.type]}</span>
                  <span className="font-semibold text-sm">{doc.number}</span>
                  <span className={`text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded border ${getStatusColor(doc.status)}`}>
                    {getStatusLabel(doc.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{doc.ownerName}</span>
                  <span>→ {doc.customerName}</span>
                  <span>{formatEUR(doc.amount)}</span>
                  <span>{formatDateDE(doc.date)}</span>
                </div>
              </div>
              <div className="shrink-0 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDocumentsUnified;
