import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Plus } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SearchBar from '@/components/shared/SearchBar';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import type { Invoice, InvoiceStatus } from '@/types';

const statusFilters: (InvoiceStatus | 'all')[] = ['all', 'draft', 'open', 'paid', 'overdue', 'cancelled'];

const Invoices = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const statusLabels = t.status as Record<string, string>;

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as (Invoice & { customer: { name: string } | null })[];
    },
    enabled: !!user,
  });

  const filtered = invoices.filter((inv) => {
    // Auto-detect overdue for filtering
    const isOverdue = inv.status === 'open' && inv.due_date && new Date(inv.due_date) < new Date();
    const effectiveStatus = isOverdue ? 'overdue' : inv.status;
    if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
    if (search && !inv.invoice_number.toLowerCase().includes(search.toLowerCase()) &&
      !inv.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t.invoices.title}</h2>
        <Link
          to="/invoices/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t.invoices.newInvoice}</span>
        </Link>
      </div>

      <div className="mb-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t.common.search} />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? t.common.all : statusLabels[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={search || statusFilter !== 'all' ? t.common.noResults : t.invoices.noInvoices}
          description={t.invoices.noInvoicesDesc}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((invoice) => {
            const isOverdue = invoice.status === 'open' && invoice.due_date && new Date(invoice.due_date) < new Date();
            const displayStatus = isOverdue ? 'overdue' : invoice.status;
            return (
              <Link
                key={invoice.id}
                to={`/invoices/${invoice.id}`}
                className="card-hover block rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{invoice.invoice_number}</h3>
                    <p className="text-sm text-muted-foreground">{invoice.customer?.name}</p>
                  </div>
                  <StatusBadge status={displayStatus as any} label={statusLabels[displayStatus as InvoiceStatus]} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    <span>{formatDateDE(invoice.date)}</span>
                    <span className={`ml-2 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                      → {formatDateDE(invoice.due_date)}
                    </span>
                  </div>
                  <span className="font-medium text-foreground">{t.common.currency}{invoice.grand_total.toFixed(2)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Invoices;
