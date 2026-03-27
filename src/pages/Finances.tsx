import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Receipt, AlertTriangle, CheckCircle, Clock, Info, Download, FileArchive, FileText } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { formatEUR, formatNumber, formatDateDE } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { generateTaxExportZip } from '@/lib/taxExport';
import { toast } from 'sonner';

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
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const fin = (t as any).finances;

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

  const isSmallBiz = !!settings?.small_business_regulation;
  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let paid = 0;
    let open = 0;
    let overdue = 0;
    let countAll = 0;
    let countOpen = 0;
    let countOverdue = 0;

    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      countAll++;
      totalGross += Number(inv.grand_total);
      totalNet += Number(inv.subtotal);
      totalTax += Number(inv.tax_total);

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

    return { totalGross, totalNet, totalTax, paid, open, overdue, countAll, countOpen, countOverdue };
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

  const handleTaxExport = async () => {
    if (!user || !settings) return;
    setExporting(true);
    setExportProgress('Daten laden…');
    try {
      const blob = await generateTaxExportZip({
        userId: user.id,
        from,
        to,
        businessSettings: settings,
        onProgress: (_percent, label) => setExportProgress(label),
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
      inv.invoice_number,
      formatDateDE(inv.date),
      formatDateDE(inv.due_date),
      inv.status,
      formatNumber(Number(inv.subtotal)),
      formatNumber(Number(inv.tax_total)),
      formatNumber(Number(inv.grand_total)),
    ]);

    // Summary rows
    rows.push([]);
    rows.push(['Zusammenfassung', '', '', '', '', '', '']);
    rows.push(['Anzahl Rechnungen', '', '', '', '', '', String(stats.countAll)]);
    rows.push(['Summe netto', '', '', '', '', '', formatNumber(stats.totalNet)]);
    if (!isSmallBiz) {
      rows.push(['Summe USt', '', '', '', '', '', formatNumber(stats.totalTax)]);
    }
    rows.push(['Summe brutto', '', '', '', '', '', formatNumber(stats.totalGross)]);
    rows.push(['Bezahlt', '', '', '', '', '', formatNumber(stats.paid)]);
    rows.push(['Offen', '', '', '', '', '', formatNumber(stats.open)]);
    rows.push(['Überfällig', '', '', '', '', '', formatNumber(stats.overdue)]);
    if (isSmallBiz) {
      rows.push(['Steuermodus', '', '', '', '', '', 'Kleinunternehmerregelung §19 UStG']);
    } else {
      rows.push(['Steuermodus', '', '', '', '', '', 'Umsatzsteuer aktiv']);
    }
    rows.push(['Zeitraum', '', '', '', '', '', `${formatDateDE(from)} – ${formatDateDE(to)}`]);
    if (settings?.business_name) {
      rows.push(['Unternehmen', '', '', '', '', '', settings.business_name]);
    }

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
          value={formatEUR(stats.totalGross)}
          icon={Receipt}
        />
        <StatCard
          title={fin?.paid || 'Bezahlt'}
          value={formatEUR(stats.paid)}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title={fin?.openAmount || 'Offen'}
          value={formatEUR(stats.open)}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title={fin?.overdueAmount || 'Überfällig'}
          value={formatEUR(stats.overdue)}
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      {/* Tax-relevant Summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">{fin?.taxSummary || 'Steuerrelevante Übersicht'}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-muted-foreground">{fin?.totalInvoices || 'Anzahl Rechnungen'}</span>
            <span className="font-medium text-foreground">{stats.countAll}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-muted-foreground">{fin?.netTotal || 'Summe netto'}</span>
            <span className="font-medium text-foreground">{formatEUR(stats.totalNet)}</span>
          </div>
          {!isSmallBiz && (
            <div className="flex justify-between rounded-lg bg-muted/30 p-3">
              <span className="text-muted-foreground">{fin?.vatTotal || 'Summe Umsatzsteuer'}</span>
              <span className="font-medium text-foreground">{formatEUR(stats.totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between rounded-lg bg-muted/30 p-3">
            <span className="text-muted-foreground">{fin?.grossTotal || 'Summe brutto'}</span>
            <span className="font-medium text-foreground">{formatEUR(stats.totalGross)}</span>
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

      {/* Export Actions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-semibold text-foreground">{fin?.exportTitle || 'Export'}</h2>
        <p className="text-sm text-muted-foreground">{fin?.exportDesc || 'Finanzübersicht und Rechnungsdaten für den gewählten Zeitraum exportieren.'}</p>

        {/* Primary: Steuerberater Export */}
        <Button
          className="w-full justify-start gap-2"
          onClick={handleTaxExport}
          disabled={exporting}
        >
          <FileArchive className="h-4 w-4" />
          <div className="flex flex-col items-start text-left">
            <span>{exporting ? exportProgress : 'Unterlagen für Steuerberater exportieren'}</span>
            <span className="text-xs font-normal opacity-75">
              Rechnungen, Angebote, CSV & Zusammenfassung als ZIP
            </span>
          </div>
        </Button>

        {/* Secondary actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCsvExport}>
            <FileText className="h-4 w-4 mr-1" />
            Nur CSV exportieren
          </Button>
        </div>
      </div>

      {/* Tax Hint */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-muted-foreground">
          {isSmallBiz
            ? (fin?.taxHintSmallBusiness || 'Hinweis: Es wird keine Umsatzsteuer berechnet (§19 UStG).')
            : (fin?.taxHintVat || 'Hinweis: Umsatzsteuer wird berücksichtigt.')}
        </div>
      </div>
    </div>
  );
};

export default Finances;
