import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ExternalLink, Copy } from 'lucide-react';
import { formatEUR } from '@/lib/utils';
import { formatDateDE } from '@/lib/generatePdf';
import { toast } from 'sonner';

type DocTab = 'all' | 'offers' | 'invoices' | 'contracts';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-900/50 text-blue-400 border-blue-800',
  accepted: 'bg-green-900/50 text-green-400 border-green-800',
  rejected: 'bg-red-900/50 text-red-400 border-red-800',
  open: 'bg-blue-900/50 text-blue-400 border-blue-800',
  paid: 'bg-green-900/50 text-green-400 border-green-800',
  overdue: 'bg-red-900/50 text-red-400 border-red-800',
  cancelled: 'bg-muted text-muted-foreground',
  entwurf: 'bg-muted text-muted-foreground',
  gesendet: 'bg-blue-900/50 text-blue-400 border-blue-800',
  aktiv: 'bg-green-900/50 text-green-400 border-green-800',
  unterzeichnet: 'bg-green-900/50 text-green-400 border-green-800',
  pausiert: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
  beendet: 'bg-muted text-muted-foreground',
};

interface UnifiedDoc {
  id: string;
  type: 'offer' | 'invoice' | 'contract';
  number: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
  publicToken?: string | null;
}

const AdminDocumentsUnified = () => {
  const [tab, setTab] = useState<DocTab>('all');
  const [search, setSearch] = useState('');

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['admin-unified-docs'],
    queryFn: async () => {
      const [offersRes, invoicesRes, contractsRes] = await Promise.all([
        supabase.from('offers').select('id, offer_number, customer_id, grand_total, status, date, public_token, customer:customers(name)'),
        supabase.from('invoices').select('id, invoice_number, customer_id, grand_total, status, date, public_token, customer:customers(name)'),
        supabase.from('contracts').select('id, contract_number, customer_id, grand_total, status, start_date, public_token, customer:customers(name)'),
      ]);

      const unified: UnifiedDoc[] = [];

      (offersRes.data || []).forEach((o: any) => unified.push({
        id: o.id, type: 'offer', number: o.offer_number,
        customerName: o.customer?.name || '–', amount: o.grand_total,
        status: o.status, date: o.date, publicToken: o.public_token,
      }));

      (invoicesRes.data || []).forEach((i: any) => unified.push({
        id: i.id, type: 'invoice', number: i.invoice_number,
        customerName: i.customer?.name || '–', amount: i.grand_total,
        status: i.status, date: i.date, publicToken: i.public_token,
      }));

      (contractsRes.data || []).forEach((c: any) => unified.push({
        id: c.id, type: 'contract', number: c.contract_number,
        customerName: c.customer?.name || '–', amount: c.grand_total,
        status: c.status, date: c.start_date, publicToken: c.public_token,
      }));

      return unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });

  const typeLabel: Record<string, string> = { offer: 'Angebot', invoice: 'Rechnung', contract: 'Vertrag' };
  const typeRoute: Record<string, string> = { offer: '/offers', invoice: '/invoices', contract: '/contracts' };

  const filtered = docs.filter(d => {
    if (tab !== 'all' && d.type !== tab.replace(/s$/, '')) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.number.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q);
    }
    return true;
  });

  const copyPublicLink = (doc: UnifiedDoc) => {
    if (!doc.publicToken) return;
    const prefix = doc.type === 'offer' ? 'offer' : doc.type === 'invoice' ? 'invoice' : 'contract';
    const link = `${window.location.origin}/${prefix}/view/${doc.publicToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Link kopiert');
  };

  const tabs: { key: DocTab; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'offers', label: 'Angebote' },
    { key: 'invoices', label: 'Rechnungen' },
    { key: 'contracts', label: 'Verträge' },
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
        <Input placeholder="Nummer oder Kunde suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
            <div key={`${doc.type}-${doc.id}`} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs text-muted-foreground">{typeLabel[doc.type]}</span>
                  <span className="font-semibold text-sm">{doc.number}</span>
                  <span className={`text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded border ${STATUS_COLORS[doc.status] || 'bg-muted text-muted-foreground'}`}>
                    {doc.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{doc.customerName}</span>
                  <span>{formatEUR(doc.amount)}</span>
                  <span>{formatDateDE(doc.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {doc.publicToken && (
                  <button onClick={() => copyPublicLink(doc)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Link kopieren">
                    <Copy className="h-4 w-4" />
                  </button>
                )}
                <a href={`/admin/documents/${doc.type}/${doc.id}`} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Öffnen">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDocumentsUnified;
