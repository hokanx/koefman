import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Copy, ExternalLink, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatEUR } from '@/lib/utils';
import { formatDateDE } from '@/lib/generatePdf';
import { toast } from 'sonner';

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
};

const TYPE_CONFIG = {
  offer: { table: 'offers' as const, itemsTable: 'offer_items' as const, fk: 'offer_id', numberField: 'offer_number', label: 'Angebot', publicPrefix: 'offer' },
  invoice: { table: 'invoices' as const, itemsTable: 'invoice_items' as const, fk: 'invoice_id', numberField: 'invoice_number', label: 'Rechnung', publicPrefix: 'invoice' },
  contract: { table: 'contracts' as const, itemsTable: 'contract_items' as const, fk: 'contract_id', numberField: 'contract_number', label: 'Vertrag', publicPrefix: 'contract' },
};

const AdminDocumentDetail = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];

  const { data: doc, isLoading } = useQuery({
    queryKey: ['admin-doc', type, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.table)
        .select('*, customer:customers(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!config && !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['admin-doc-items', type, id],
    queryFn: async () => {
      const { data } = await supabase
        .from(config.itemsTable)
        .select('*')
        .eq(config.fk, id!)
        .order('sort_order');
      return (data || []) as any[];
    },
    enabled: !!config && !!id,
  });

  if (!config) {
    return <p className="text-muted-foreground p-6">Unbekannter Dokumenttyp.</p>;
  }

  const docNumber = doc?.[config.numberField] || '–';
  const publicToken = doc?.public_token;
  const publicUrl = publicToken ? `${window.location.origin}/${config.publicPrefix}/view/${publicToken}` : null;

  const copyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link kopiert');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/documents')} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{config.label}</p>
          <h2 className="text-lg font-bold text-foreground truncate">{docNumber}</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border border-foreground border-t-transparent" />
        </div>
      ) : !doc ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Dokument nicht gefunden.</p>
      ) : (
        <>
          {/* Meta */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-[10px] font-bold tracking-[0.08em] px-2.5 py-1 rounded border ${STATUS_COLORS[doc.status] || 'bg-muted text-muted-foreground'}`}>
                {doc.status}
              </span>
              <span className="text-sm text-muted-foreground">{formatDateDE(doc.date || doc.start_date)}</span>
              <span className="text-sm font-semibold">{formatEUR(doc.grand_total)}</span>
            </div>

            {doc.customer && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kunde</p>
                <p className="text-sm font-medium">{doc.customer.name}</p>
                {doc.customer.email && <p className="text-xs text-muted-foreground">{doc.customer.email}</p>}
              </div>
            )}

            {doc.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notizen</p>
                <p className="text-sm text-foreground/80">{doc.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Positionen</p>
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-semibold">{formatEUR(item.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{item.quantity} × {formatEUR(item.unit_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-sm font-semibold">Gesamt</span>
                <span className="text-sm font-bold">{formatEUR(doc.grand_total)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {publicUrl && (
              <>
                <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                  <Copy className="h-3.5 w-3.5" /> Link kopieren
                </button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Öffentliche Ansicht
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDocumentDetail;
