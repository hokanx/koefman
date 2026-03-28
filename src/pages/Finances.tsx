import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatNumber, formatDateDE } from '@/lib/utils';
import { generateTaxExportZip } from '@/lib/taxExport';
import { toast } from 'sonner';
import FinanceCards from '@/components/finances/FinanceCards';
import TaxOverview from '@/components/finances/TaxOverview';
import EuerSection from '@/components/finances/EuerSection';
import DocumentStatus from '@/components/finances/DocumentStatus';
import FinanceActions from '@/components/finances/FinanceActions';

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
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
};

const Finances = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange>('month');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const { data: invoices = [] } = useQuery({
    queryKey: ['finances-invoices', user?.id, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, status, grand_total, tax_total, subtotal, date, due_date, invoice_number')
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
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['finances-documents', user?.id, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('id, created_at, category')
        .eq('user_id', user!.id)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const hasBankDocs = documents.some((d: any) =>
    ['kontoauszuege', 'kreditkarte', 'paypal_stripe', 'kassenbuch'].includes(d.category)
  );

  const isSmallBiz = !!settings?.small_business_regulation;
  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    let totalGross = 0, totalNet = 0, totalTax = 0, paid = 0, open = 0, overdue = 0;
    let countAll = 0, countOpen = 0, countOverdue = 0;
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      countAll++;
      totalGross += Number(inv.grand_total);
      totalNet += Number(inv.subtotal);
      totalTax += Number(inv.tax_total);
      if (inv.status === 'paid') {
        paid += Number(inv.grand_total);
      } else if (inv.status === 'open' || inv.status === 'draft') {
        if (inv.due_date && inv.due_date < today) {
          overdue += Number(inv.grand_total);
          countOverdue++;
        } else {
          open += Number(inv.grand_total);
          countOpen++;
        }
      }
    }
    return { totalGross, totalNet, totalTax, paid, open, overdue, countAll, countOpen, countOverdue };
  }, [invoices, today]);

  const rangeOptions: { value: DateRange; label: string }[] = [
    { value: 'month', label: 'Monat' },
    { value: 'quarter', label: 'Quartal' },
    { value: 'year', label: 'Jahr' },
  ];

  const rangeLabel = range === 'month'
    ? new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : range === 'quarter'
      ? `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
      : `${new Date().getFullYear()}`;

  const handleTaxExport = async () => {
    if (!user || !settings) return;
    setExporting(true);
    setExportProgress('Daten laden…');
    try {
      const blob = await generateTaxExportZip({
        userId: user.id, from, to, businessSettings: settings,
        onProgress: (_p, label) => setExportProgress(label),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Steuerberater_${from}_${to}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export wurde erstellt');
    } catch (e) {
      console.error('Tax export failed', e);
      toast.error('Export fehlgeschlagen');
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  const handleCsvExport = () => {
    const relevant = invoices.filter((inv) => inv.status !== 'cancelled');
    const header = ['Rechnungsnummer', 'Datum', 'Fällig', 'Status', 'Netto', 'USt', 'Brutto'];
    const rows = relevant.map((inv) => [
      inv.invoice_number, formatDateDE(inv.date), formatDateDE(inv.due_date), inv.status,
      formatNumber(Number(inv.subtotal)), formatNumber(Number(inv.tax_total)), formatNumber(Number(inv.grand_total)),
    ]);
    rows.push([]);
    rows.push(['Zusammenfassung', '', '', '', '', '', '']);
    rows.push(['Anzahl Rechnungen', '', '', '', '', '', String(stats.countAll)]);
    rows.push(['Summe netto', '', '', '', '', '', formatNumber(stats.totalNet)]);
    if (!isSmallBiz) rows.push(['Summe USt', '', '', '', '', '', formatNumber(stats.totalTax)]);
    rows.push(['Summe brutto', '', '', '', '', '', formatNumber(stats.totalGross)]);
    rows.push(['Bezahlt', '', '', '', '', '', formatNumber(stats.paid)]);
    rows.push(['Offen', '', '', '', '', '', formatNumber(stats.open)]);
    rows.push(['Überfällig', '', '', '', '', '', formatNumber(stats.overdue)]);
    rows.push(['Steuermodus', '', '', '', '', '', isSmallBiz ? 'Kleinunternehmerregelung §19 UStG' : 'Umsatzsteuer aktiv']);
    rows.push(['Zeitraum', '', '', '', '', '', `${formatDateDE(from)} – ${formatDateDE(to)}`]);
    if (settings?.business_name) rows.push(['Unternehmen', '', '', '', '', '', settings.business_name]);
    const csvContent = [header, ...rows].map((r) => (r as string[]).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finanzuebersicht_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Steuer & Finanzen</h1>
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

      {/* Summary Cards */}
      <FinanceCards
        totalGross={stats.totalGross}
        paid={stats.paid}
        open={stats.open}
        overdue={stats.overdue}
        labels={{
          totalRevenue: 'Umsatz gesamt',
          paid: 'Bezahlt',
          openAmount: 'Offen',
          overdueAmount: 'Überfällig',
        }}
      />

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left column: financial overview */}
        <div className="space-y-4">
          <TaxOverview
            isSmallBiz={isSmallBiz}
            totalNet={stats.totalNet}
            totalTax={stats.totalTax}
            totalGross={stats.totalGross}
            countAll={stats.countAll}
            countOpen={stats.countOpen}
            countOverdue={stats.countOverdue}
          />
          <EuerSection income={stats.paid} expenses={0} />
        </div>

        {/* Right column: documents + actions */}
        <div className="space-y-4">
          <DocumentStatus
            count={documents.length}
            lastUploadDate={documents[0]?.created_at}
            hasBankDocs={documents.length > 0 ? hasBankDocs : undefined}
          />
          <FinanceActions
            onTaxExport={handleTaxExport}
            onCsvExport={handleCsvExport}
            exporting={exporting}
            exportProgress={exportProgress}
          />
        </div>
      </div>

      {/* Tax hint */}
      {!isSmallBiz && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Hinweis: Umsatzsteuer wird berücksichtigt.
        </div>
      )}
    </div>
  );
};

export default Finances;
