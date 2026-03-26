import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';

type DateRange = 'month' | 'quarter' | 'year';

const getDateRange = (range: DateRange): { from: string; to: string } => {
  const now = new Date();
  let from: Date;
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (range) {
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), q, 1);
      break;
    }
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
};

const Finances = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange>('month');
  const fin = (t as any).finances;

  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const { data: invoices = [] } = useQuery({
    queryKey: ['finances-invoices', user?.id, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, status, grand_total, tax_total, subtotal, date, due_date')
        .eq('user_id', user!.id)
        .gte('date', from)
        .lte('date', to);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('small_business_regulation')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let open = 0;
    let overdue = 0;
    let countAll = 0;
    let countOpen = 0;
    let countOverdue = 0;

    for (const inv of invoices) {
      // Exclude cancelled/draft from revenue
      if (inv.status === 'cancelled') continue;
      countAll++;
      total += Number(inv.grand_total);

      if (inv.status === 'paid') {
        paid += Number(inv.grand_total);
      } else if (inv.status === 'open' || inv.status === 'draft') {
        const isOverdue = inv.due_date && inv.due_date < today;
        if (isOverdue) {
          overdue += Number(inv.grand_total);
          countOverdue++;
        } else {
          open += Number(inv.grand_total);
          countOpen++;
        }
      }
    }

    return { total, paid, open, overdue, countAll, countOpen, countOverdue };
  }, [invoices, today]);

  const rangeOptions: { value: DateRange; label: string }[] = [
    { value: 'month', label: fin?.month || 'Monat' },
    { value: 'quarter', label: fin?.quarter || 'Quartal' },
    { value: 'year', label: fin?.year || 'Jahr' },
  ];

  const rangeLabel = range === 'month'
    ? new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : range === 'quarter'
      ? `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
      : `${new Date().getFullYear()}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{fin?.title || 'Steuer & Finanzen'}</h1>
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        {rangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              range === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title={fin?.totalRevenue || 'Umsatz gesamt'}
          value={`€${stats.total.toFixed(2)}`}
          icon={Receipt}
        />
        <StatCard
          title={fin?.paid || 'Bezahlt'}
          value={`€${stats.paid.toFixed(2)}`}
          icon={CheckCircle}
        />
        <StatCard
          title={fin?.openAmount || 'Offen'}
          value={`€${stats.open.toFixed(2)}`}
          icon={Clock}
        />
        <StatCard
          title={fin?.overdueAmount || 'Überfällig'}
          value={`€${stats.overdue.toFixed(2)}`}
          icon={AlertTriangle}
        />
      </div>

      {/* Invoice Summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">{fin?.invoiceSummary || 'Rechnungsübersicht'}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-muted-foreground">{fin?.totalInvoices || 'Anzahl Rechnungen'}</span>
            <span className="font-medium text-foreground">{stats.countAll}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-muted-foreground">{fin?.openInvoices || 'Offene Rechnungen'}</span>
            <span className="font-medium text-foreground">{stats.countOpen}</span>
          </div>
          {stats.countOverdue > 0 && (
            <div className="flex justify-between rounded-lg bg-warning/10 p-3">
              <span className="text-warning">{fin?.overdueInvoices || 'Überfällige Rechnungen'}</span>
              <span className="font-medium text-warning">{stats.countOverdue}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tax Hint */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-muted-foreground">
          {settings?.small_business_regulation
            ? (fin?.taxHintSmallBusiness || 'Hinweis: Es wird keine Umsatzsteuer berechnet (§19 UStG).')
            : (fin?.taxHintVat || 'Hinweis: Umsatzsteuer wird berücksichtigt.')}
        </div>
      </div>
    </div>
  );
};

export default Finances;
