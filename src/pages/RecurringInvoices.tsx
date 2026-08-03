import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import { Button } from '@/components/ui/button';
import { Pause, Play, XCircle, FileText } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { StatusBadgeProps } from '@/components/shared/StatusBadge';

type RecurringInvoiceWithRelations = Tables<'recurring_invoices'> & {
  customer: Pick<Tables<'customers'>, 'name'> | null;
  source_invoice: Pick<Tables<'invoices'>, 'invoice_number'> | null;
};

const frequencyLabels: Record<string, Record<string, string>> = {
  weekly: { de: 'Wöchentlich', en: 'Weekly', ar: 'أسبوعياً' },
  every_2_weeks: { de: 'Alle 2 Wochen', en: 'Every 2 weeks', ar: 'كل أسبوعين' },
  monthly: { de: 'Monatlich', en: 'Monthly', ar: 'شهرياً' },
  quarterly: { de: 'Vierteljährlich', en: 'Quarterly', ar: 'ربع سنوي' },
};

const RecurringInvoices = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rt = t.recurring;
  const statusLabels = t.status as Record<string, string>;

  const { data: recurringList = [], isLoading } = useQuery({
    queryKey: ['recurring-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select('*, customer:customers(name), source_invoice:invoices(invoice_number)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RecurringInvoiceWithRelations[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('recurring_invoices').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      toast.success(rt.updated);
    },
  });

  const recurringStatusMap: Record<string, string> = {
    active: 'paid',
    paused: 'draft',
    ended: 'cancelled',
  };
  const recurringStatusLabel: Record<string, string> = {
    active: rt.active,
    paused: rt.paused,
    ended: rt.ended,
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">{rt.title}</h1>

      {recurringList.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{rt.noRecurring}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recurringList.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{r.customer?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {frequencyLabels[r.frequency]?.[language] || r.frequency}
                  </p>
                </div>
                <StatusBadge
                  status={recurringStatusMap[r.status] as StatusBadgeProps['status']}
                  label={recurringStatusLabel[r.status] || r.status}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-xs font-medium">{rt.nextRunDate}</span>
                  <p className="text-foreground">{formatDateDE(r.next_run_date)}</p>
                </div>
                <div>
                  <span className="text-xs font-medium">{rt.sourceInvoice}</span>
                  <button
                    onClick={() => navigate(`/invoices/${r.source_invoice_id}`)}
                    className="block text-primary hover:underline"
                  >
                    {r.source_invoice?.invoice_number || '–'}
                  </button>
                </div>
              </div>

              {r.end_date && (
                <p className="text-xs text-muted-foreground">{rt.endDate}: {formatDateDE(r.end_date)}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {r.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'paused' })}>
                    <Pause className="h-3.5 w-3.5 mr-1" /> {rt.pause}
                  </Button>
                )}
                {r.status === 'paused' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: 'active' })}>
                    <Play className="h-3.5 w-3.5 mr-1" /> {rt.resume}
                  </Button>
                )}
                {r.status !== 'ended' && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus.mutate({ id: r.id, status: 'ended' })}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> {rt.end}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/invoices?recurring=${r.id}`)}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> {t.nav.invoices}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurringInvoices;
