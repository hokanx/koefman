import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Download, Edit } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { generatePdf } from '@/lib/generatePdf';
import type { InvoiceStatus } from '@/types';

const InvoiceDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const statusLabels: Record<InvoiceStatus, string> = {
    open: t.invoices.open, paid: t.invoices.paid, overdue: t.invoices.overdue, cancelled: t.invoices.cancelled,
  };

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*, customer:customers(*)').eq('id', id!).eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['invoice-items', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id!).order('sort_order');
      return data || [];
    },
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-counts'] });
      toast.success(t.common.success);
    },
  });

  const handlePdfExport = async () => {
    if (!invoice) return;
    setGenerating(true);
    try {
      await generatePdf({
        type: 'invoice',
        documentTitle: t.invoices.documentTitle,
        documentNumber: invoice.invoice_number,
        date: new Date(invoice.date).toLocaleDateString(),
        dueDate: new Date(invoice.due_date).toLocaleDateString(),
        business: {
          business_name: settings?.business_name || '',
          address: settings?.address || undefined,
          email: settings?.email || undefined,
          phone: settings?.phone || undefined,
          tax_number: settings?.tax_number || undefined,
          vat_id: settings?.vat_id || undefined,
          logo_url: settings?.logo_url || undefined,
          payment_terms: settings?.payment_terms || undefined,
        },
        customer: {
          name: (invoice as any).customer?.name || '',
          address: (invoice as any).customer?.address || undefined,
        },
        items: items.map((i: any) => ({
          title: i.title, description: i.description, quantity: i.quantity,
          unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total,
        })),
        subtotal: invoice.subtotal, tax_total: invoice.tax_total, grand_total: invoice.grand_total,
        notes: invoice.notes || undefined,
        labels: {
          date: t.invoices.date, dueDate: t.invoices.dueDate, quantity: t.invoices.quantity,
          unit: t.invoices.unit, unitPrice: t.invoices.unitPrice, taxRate: t.invoices.taxRate,
          total: t.invoices.total, subtotal: t.invoices.subtotal, taxTotal: t.invoices.taxTotal,
          grandTotal: t.invoices.grandTotal, description: t.invoices.description,
          itemTitle: t.invoices.itemTitle, page: 'Seite',
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  if (!invoice) {
    return <div className="p-6 text-center text-muted-foreground">{t.common.noResults}</div>;
  }

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate('/invoices')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{invoice.invoice_number}</h2>
              <p className="text-sm text-muted-foreground">{(invoice as any).customer?.name}</p>
            </div>
            <StatusBadge status={invoice.status as any} label={statusLabels[invoice.status as InvoiceStatus]} />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t.invoices.date}: {new Date(invoice.date).toLocaleDateString()}</p>
            <p>{t.invoices.dueDate}: {new Date(invoice.due_date).toLocaleDateString()}</p>
          </div>
          {invoice.notes && <p className="mt-2 text-sm text-foreground">{invoice.notes}</p>}
          {invoice.source_offer_id && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t.invoices.fromOffer}: <Link to={`/offers/${invoice.source_offer_id}`} className="font-medium text-primary hover:underline">{invoice.source_offer_id.slice(0, 8)}…</Link>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/invoices/${id}/edit`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <Edit className="h-4 w-4" /> {t.invoices.editInvoice}
            </Link>
            <button onClick={handlePdfExport} disabled={generating}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
              <Download className="h-4 w-4" /> {generating ? t.common.generating : t.common.downloadPdf}
            </button>
            {invoice.status === 'open' && (
              <button onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> {t.invoices.markAsPaid}
              </button>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 font-semibold text-foreground">{t.invoices.items}</h3>
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    <p className="text-muted-foreground">{item.quantity} × {t.common.currency}{item.unit_price.toFixed(2)}</p>
                  </div>
                  <p className="font-medium text-foreground">{t.common.currency}{item.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.invoices.subtotal}</span><span>{t.common.currency}{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.invoices.taxTotal}</span><span>{t.common.currency}{invoice.tax_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t.invoices.grandTotal}</span><span>{t.common.currency}{invoice.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetail;
