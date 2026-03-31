import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatEUR } from '@/lib/utils';
import { generateTaxExportZip, generateFullArchiveZip } from '@/lib/taxExport';
import { toast } from 'sonner';
import { FileArchive, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const TaxExport = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useImpersonation();
  const [range, setRange] = useState<DateRange>('month');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const targetUserId = effectiveUserId || user?.id;
  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const { data: invoices = [] } = useQuery({
    queryKey: ['tax-invoices', targetUserId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, status, grand_total, tax_total, subtotal, date, invoice_number')
        .eq('user_id', targetUserId!)
        .gte('date', from)
        .lte('date', to);
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['tax-documents', targetUserId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('id, category, status')
        .eq('user_id', targetUserId!)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59');
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', targetUserId!)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  const stats = useMemo(() => {
    let totalGross = 0, totalTax = 0;
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      totalGross += Number(inv.grand_total);
      totalTax += Number(inv.tax_total);
    }
    return { invoiceCount: invoices.filter(i => i.status !== 'cancelled').length, documentCount: documents.length, totalGross, totalTax };
  }, [invoices, documents]);

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
    if (!targetUserId || !settings) return;
    setExporting(true);
    setExportProgress('Daten laden…');
    try {
      const blob = await generateTaxExportZip({
        userId: targetUserId, from, to, businessSettings: settings,
        onProgress: (_p, label) => setExportProgress(label),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Steuerberater_${from}_${to}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export erstellt');
    } catch (e) {
      console.error('Tax export failed', e);
      toast.error('Export fehlgeschlagen');
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  const handleFullExport = async () => {
    if (!targetUserId || !settings) return;
    setExporting(true);
    setExportProgress('Daten laden…');
    try {
      const blob = await generateFullArchiveZip({
        userId: targetUserId, from, to, businessSettings: settings,
        onProgress: (_p, label) => setExportProgress(label),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Archiv_${from}_${to}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Archiv erstellt');
    } catch (e) {
      console.error('Full export failed', e);
      toast.error('Export fehlgeschlagen');
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  const handleCsvExport = () => {
    const relevant = invoices.filter((inv) => inv.status !== 'cancelled');
    const header = ['Rechnungsnummer', 'Datum', 'Status', 'Netto', 'USt', 'Brutto'];
    const rows = relevant.map((inv) => [
      inv.invoice_number, inv.date, inv.status,
      Number(inv.subtotal).toFixed(2).replace('.', ','),
      Number(inv.tax_total).toFixed(2).replace('.', ','),
      Number(inv.grand_total).toFixed(2).replace('.', ','),
    ]);
    const csvContent = [header, ...rows].map((r) => (r as string[]).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rechnungen_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-5 mx-auto max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">STEUER EXPORT</h1>
        <p className="text-sm text-muted-foreground mt-1">{rangeLabel}</p>
      </div>

      {/* Zeitraum */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        {rangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              range === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Zusammenfassung</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.invoiceCount}</p>
            <p className="text-xs text-muted-foreground">Rechnungen</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.documentCount}</p>
            <p className="text-xs text-muted-foreground">Belege</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{formatEUR(stats.totalGross)}</p>
            <p className="text-xs text-muted-foreground">Umsatz brutto</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{formatEUR(stats.totalTax)}</p>
            <p className="text-xs text-muted-foreground">USt gesamt</p>
          </div>
        </div>
      </div>

      {/* Export actions */}
      <div className="space-y-3">
        <Button className="w-full justify-start gap-3 h-auto py-4" onClick={handleTaxExport} disabled={exporting}>
          <FileArchive className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="font-medium">{exporting ? exportProgress : 'Export für Steuerberater'}</p>
            <p className="text-xs font-normal opacity-75">Rechnungen, Belege & Zusammenfassung als ZIP</p>
          </div>
        </Button>

        <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4" onClick={handleFullExport} disabled={exporting}>
          <Download className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="font-medium">{exporting ? exportProgress : 'Vollständiges Archiv'}</p>
            <p className="text-xs font-normal opacity-75">Alle Dokumente inkl. Angebote</p>
          </div>
        </Button>

        <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4" onClick={handleCsvExport}>
          <FileText className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="font-medium">CSV Export</p>
            <p className="text-xs font-normal opacity-75">Rechnungsdaten als Tabelle</p>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default TaxExport;
