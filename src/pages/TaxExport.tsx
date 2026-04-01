import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery } from '@tanstack/react-query';
import { formatEUR } from '@/lib/utils';
import { fetchTaxExportSummary, generateCleanTaxExportZip } from '@/lib/cleanTaxExport';
import { toast } from 'sonner';
import { FileArchive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';
import { supabase } from '@/integrations/supabase/client';

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
  const { isKleinunternehmer } = useOrgTaxMode();
  const [range, setRange] = useState<DateRange>('month');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const targetUserId = effectiveUserId || user?.id;
  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const { data: summary } = useQuery({
    queryKey: ['tax-export-summary', targetUserId, from, to],
    queryFn: () => fetchTaxExportSummary(targetUserId!, from, to),
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

  const handleExport = async () => {
    if (!targetUserId || !settings) return;
    setExporting(true);
    setExportProgress('Daten laden…');
    try {
      const blob = await generateCleanTaxExportZip({
        userId: targetUserId, from, to, businessSettings: settings,
        isKleinunternehmer,
        onProgress: (_p, label) => setExportProgress(label),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `steuer-export-${from}_${to}.zip`;
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

  const invoiceCount = summary?.paidInvoices.length ?? 0;
  const expenseCount = summary?.validExpenses.length ?? 0;
  const isReady = summary?.isReady ?? false;
  const warnings = summary?.warnings ?? [];

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-5 mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">STEUER EXPORT</h1>

      {/* Zeitraum */}
      <div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                range === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{rangeLabel}</p>
      </div>

      {/* Readiness */}
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${
        isReady ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'
      }`}>
        {isReady ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />}
        <div>
          <p className="text-sm font-medium text-foreground">
            {isReady ? 'Bereit für Export' : 'Noch keine Daten vorhanden'}
          </p>
          {!isReady && invoiceCount === 0 && expenseCount === 0 && (
            <p className="text-xs text-muted-foreground">Fügen Sie Einnahmen oder Ausgaben hinzu</p>
          )}
          {warnings.map((w, i) => <p key={i} className="text-xs text-muted-foreground">{w}</p>)}
          {isReady && <p className="text-xs text-muted-foreground">{invoiceCount} Rechnungen · {expenseCount} Belege</p>}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Einnahmen</span>
          <span className="text-lg font-bold text-foreground">{formatEUR(summary?.totalIncome ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Ausgaben</span>
          <span className="text-lg font-bold text-foreground">{formatEUR(summary?.totalExpenses ?? 0)}</span>
        </div>
        {!isKleinunternehmer && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Steuer</span>
            <span className="text-lg font-bold text-foreground">{formatEUR(summary?.totalTax ?? 0)}</span>
          </div>
        )}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Gewinn</span>
          <span className="text-xl font-bold text-foreground">{formatEUR(summary?.profit ?? 0)}</span>
        </div>
      </div>

      {/* Export */}
      {isReady && (
        <p className="text-sm text-center text-muted-foreground">Bereit für Steuerberater</p>
      )}
      <Button
        className="w-full h-auto py-4 text-base"
        onClick={handleExport}
        disabled={exporting || !isReady}
      >
        <FileArchive className="h-5 w-5 mr-3 shrink-0" />
        {exporting ? exportProgress : 'Export für Steuerberater'}
      </Button>
    </div>
  );
};

export default TaxExport;
