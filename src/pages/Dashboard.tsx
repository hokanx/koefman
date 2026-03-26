import { Users, FileText, Receipt, Plus, ArrowRight, Inbox, RepeatIcon } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: customerCount = 0 } = useQuery({
    queryKey: ['customer-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: offerCount = 0 } = useQuery({
    queryKey: ['offer-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: invoiceCounts = { total: 0, open: 0, paid: 0, overdue: 0 } } = useQuery({
    queryKey: ['invoice-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('status')
        .eq('user_id', user!.id);
      const invoices = data || [];
      return {
        total: invoices.length,
        open: invoices.filter((i) => i.status === 'open').length,
        paid: invoices.filter((i) => i.status === 'paid').length,
        overdue: invoices.filter((i) => i.status === 'overdue').length,
      };
    },
    enabled: !!user,
  });

  const { data: pendingOffers = 0 } = useQuery({
    queryKey: ['pending-offers'],
    queryFn: async () => {
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'sent');
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

  const { data: recentOffers = [] } = useQuery({
    queryKey: ['recent-offers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('id, offer_number, status, date, grand_total, customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recentInvoices = [] } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, date, grand_total, customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: nextRecurring } = useQuery({
    queryKey: ['next-recurring'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recurring_invoices')
        .select('next_run_date, customer:customers(name)')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('next_run_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const todoItems = [
    {
      label: t.dashboard.overdueInvoices,
      count: invoiceCounts.overdue,
      variant: 'destructive' as const,
      onClick: () => navigate('/invoices?status=overdue'),
    },
    {
      label: t.dashboard.openInvoices,
      count: invoiceCounts.open,
      variant: 'warning' as const,
      onClick: () => navigate('/invoices?status=open'),
    },
    {
      label: t.dashboard.pendingOffers,
      count: pendingOffers,
      variant: 'info' as const,
      onClick: () => navigate('/offers?status=sent'),
    },
  ].filter((item) => item.count > 0);

  const variantColors: Record<string, string> = {
    destructive: 'text-destructive bg-destructive/10 border-destructive/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    info: 'text-info bg-info/10 border-info/20',
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-6">
      {/* New Leads Alert */}
      {newLeadsCount > 0 && (
        <button
          onClick={() => navigate('/leads?status=new')}
          className="w-full flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div className="text-start">
              <p className="text-sm font-semibold text-foreground">
                {newLeadsCount} {t.dashboard.newLeads}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            {t.dashboard.viewNow}
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{t.dashboard.quickActions}</h2>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col gap-1.5 py-4 text-xs md:text-sm"
            onClick={() => navigate('/customers/new')}
          >
            <Plus className="h-5 w-5 text-primary" />
            {t.customers.newCustomer}
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-1.5 py-4 text-xs md:text-sm"
            onClick={() => navigate('/offers/new')}
          >
            <Plus className="h-5 w-5 text-primary" />
            {t.offers.newOffer}
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-1.5 py-4 text-xs md:text-sm"
            onClick={() => navigate('/invoices/new')}
          >
            <Plus className="h-5 w-5 text-primary" />
            {t.invoices.newInvoice}
          </Button>
        </div>
      </div>

      {/* To-Do / Actions */}
      {todoItems.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">{t.dashboard.todoTitle}</h2>
          <div className="space-y-2">
            {todoItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between rounded-xl border p-3.5 transition-colors hover:opacity-80 ${variantColors[item.variant]}`}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{item.count}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{t.dashboard.recentActivity}</h2>
        {recentOffers.length === 0 && recentInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.dashboard.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {recentOffers.map((offer: any) => (
              <button
                key={offer.id}
                onClick={() => navigate(`/offers/${offer.id}`)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {offer.offer_number} – {offer.customers?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateDE(offer.date)}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <StatusBadge status={offer.status as any} label={(t.status as any)[offer.status] || offer.status} />
                </div>
              </button>
            ))}
            {recentInvoices.map((inv: any) => (
              <button
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {inv.invoice_number} – {inv.customers?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateDE(inv.date)}</p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <StatusBadge status={inv.status as any} label={(t.status as any)[inv.status] || inv.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats (secondary) */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">{t.dashboard.statsTitle}</h2>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <StatCard title={t.dashboard.totalCustomers} value={customerCount} icon={Users} />
          <StatCard title={t.dashboard.totalOffers} value={offerCount} icon={FileText} />
          <StatCard title={t.dashboard.totalInvoices} value={invoiceCounts.total} icon={Receipt} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
