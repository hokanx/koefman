import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { generateTaxExportZip } from '@/lib/taxExport';
import { toast } from 'sonner';
import { Info, TrendingUp, TrendingDown, PiggyBank, Clock, AlertTriangle, CheckCircle2, FileArchive, FileText, Download, MinusCircle, CircleDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useImpersonation } from '@/contexts/ImpersonationContext';

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

const getPeriodKey = (range: DateRange): string => {
  const now = new Date();
  if (range === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (range === 'quarter') return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
  return `${now.getFullYear()}`;
};

const Finances = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { effectiveUserId, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<DateRange>('month');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const targetUserId = effectiveUserId || user?.id;
  const { from, to } = useMemo(() => getDateRange(range), [range]);
  const periodKey = useMemo(() => getPeriodKey(range), [range]);

  const { data: invoices = [] } = useQuery({
    queryKey: ['finances-invoices', targetUserId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, status, grand_total, tax_total, subtotal, date, due_date, invoice_number')
        .eq('user_id', targetUserId!)
        .gte('date', from)
        .lte('date', to);
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

  const { data: documents = [] } = useQuery({
    queryKey: ['finances-documents', targetUserId, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('id, created_at, category, status, extracted_data')
        .eq('user_id', targetUserId!)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const { data: periodStatus } = useQuery({
    queryKey: ['period-completeness', targetUserId, periodKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('period_completeness')
        .select('*')
        .eq('user_id', targetUserId!)
        .eq('period_key', periodKey)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  const upsertPeriodStatus = useMutation({
    mutationFn: async (updates: { no_activity?: boolean; admin_override?: boolean }) => {
      const payload: any = {
        user_id: targetUserId!,
        period_key: periodKey,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.admin_override !== undefined) {
        payload.admin_override_by = user?.id;
      }
      const { error } = await supabase
        .from('period_completeness')
        .upsert(payload, { onConflict: 'user_id,period_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-completeness'] });
      toast.success('Status aktualisiert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const isSmallBiz = !!settings?.small_business_regulation;
  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    let totalGross = 0, totalNet = 0, totalTax = 0, paid = 0, open = 0, overdue = 0;
    let countOverdue = 0;
    let expenses = 0, docIncome = 0;

    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
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
        }
      }
    }

    // Include approved documents (geprüft/verarbeitet) with extracted amounts
    const expenseCategories = ['eingangsrechnungen', 'bewirtung', 'fahrtkosten', 'reisekosten', 'miete', 'versicherungen', 'ausgaben'];
    const incomeCategories = ['zahlungseingaenge', 'gutschriften'];

    for (const doc of documents) {
      const d = doc as any;
      if (d.status !== 'geprueft' && d.status !== 'verarbeitet') continue;
      const ext = d.extracted_data as any;
      if (!ext) continue;
      const amount = Number(ext.total_amount) || Number(ext.net_amount) || 0;
      if (amount <= 0) continue;

      if (expenseCategories.includes(d.category)) {
        expenses += amount;
      } else if (incomeCategories.includes(d.category)) {
        docIncome += amount;
      }
    }

    const totalIncome = paid + docIncome;
    const profit = totalIncome - expenses;

    return { totalGross, totalNet, totalTax, paid, open, overdue, countOverdue, expenses, docIncome, totalIncome, profit };
  }, [invoices, documents, today]);

  // Completeness logic
  const completeness = useMemo(() => {
    const isNoActivity = !!periodStatus?.no_activity;
    const isAdminOverride = !!periodStatus?.admin_override;

    if (isNoActivity || isAdminOverride) {
      return { state: 'complete' as const, hints: [] as string[], isOverride: true };
    }

    const hasInvoices = invoices.some(inv => inv.status !== 'cancelled');
    const hasExpenseDocs = documents.some((d: any) =>
      ['eingangsrechnungen', 'bewirtung', 'fahrtkosten', 'reisekosten', 'miete', 'versicherungen', 'ausgaben'].includes(d.category)
    );
    const hasBankDocs = documents.some((d: any) =>
      ['kontoauszuege', 'kreditkarte', 'paypal_stripe', 'kassenbuch'].includes(d.category)
    );

    const checks = [hasInvoices, hasExpenseDocs, hasBankDocs];
    const passed = checks.filter(Boolean).length;

    const hints: string[] = [];
    if (!hasInvoices) hints.push('Keine Einnahmen erfasst');
    if (!hasExpenseDocs) hints.push('Keine Ausgaben vorhanden');
    if (!hasBankDocs) hints.push('Kontoauszug fehlt');

    let state: 'complete' | 'partial' | 'incomplete';
    if (passed === 3) state = 'complete';
    else if (passed >= 1) state = 'partial';
    else state = 'incomplete';

    return { state, hints, isOverride: false };
  }, [invoices, documents, periodStatus]);

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
    const csvContent = [header, ...rows].map((r) => (r as string[]).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rechnungen_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Row = ({ label, value, icon: Icon, color }: { label: string; value: string; icon?: any; color?: string }) => (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`font-medium ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Steuer & Finanzen</h1>
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
      </div>

      {/* Zeitraum filter */}
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

      {/* Finanzübersicht */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Finanzübersicht</h2>
        <div className="space-y-2">
          <Row label="Einnahmen gesamt" value={formatEUR(stats.paid)} icon={TrendingUp} color="text-success" />
          <Row label="Ausgaben gesamt" value={formatEUR(0)} icon={TrendingDown} color="text-destructive" />
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Gewinn</span>
              </div>
              <span className={`text-lg font-bold ${stats.paid >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatEUR(stats.paid)}
              </span>
            </div>
          </div>
          {stats.open > 0 && (
            <Row label="Offene Rechnungen" value={formatEUR(stats.open)} icon={Clock} color="text-warning" />
          )}
          {stats.overdue > 0 && (
            <Row label="Überfällige Rechnungen" value={formatEUR(stats.overdue)} icon={AlertTriangle} color="text-destructive" />
          )}
        </div>
      </div>

      {/* Steuerübersicht */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Steuerübersicht</h2>
        {isSmallBiz ? (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Kleinunternehmerregelung aktiv (§19 UStG) – keine Umsatzsteuer wird berechnet.</span>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Netto gesamt" value={formatEUR(stats.totalNet)} />
            <Row label="Umsatzsteuer gesamt" value={formatEUR(stats.totalTax)} />
            <Row label="Brutto gesamt" value={formatEUR(stats.totalGross)} />
          </div>
        )}
      </div>

      {/* Unterlagenstatus */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Unterlagenstatus</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Hochgeladene Belege</span>
            <span className="font-medium text-foreground">{documents.length}</span>
          </div>

          {/* Completeness status */}
          {completeness.state === 'complete' ? (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <span>Alles vollständig für diesen Zeitraum</span>
                {completeness.isOverride && periodStatus?.no_activity && (
                  <span className="ml-1 text-xs opacity-75">(Keine Aktivität)</span>
                )}
                {completeness.isOverride && periodStatus?.admin_override && !periodStatus?.no_activity && (
                  <span className="ml-1 text-xs opacity-75">(Manuell bestätigt)</span>
                )}
              </div>
            </div>
          ) : completeness.state === 'partial' ? (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
              <CircleDashed className="h-4 w-4 shrink-0" />
              Teilweise vollständig
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Es fehlen noch Unterlagen
            </div>
          )}

          {/* Specific missing hints */}
          {completeness.hints.length > 0 && !completeness.isOverride && (
            <div className="space-y-1.5 pl-1">
              {completeness.hints.map((hint) => (
                <div key={hint} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MinusCircle className="h-3 w-3 shrink-0 text-warning" />
                  {hint}
                </div>
              ))}
            </div>
          )}

          {/* No-activity toggle for users */}
          {completeness.state !== 'complete' && (
            <button
              onClick={() => upsertPeriodStatus.mutate({ no_activity: true })}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <MinusCircle className="h-4 w-4 shrink-0" />
              Keine Aktivität in diesem Zeitraum
            </button>
          )}

          {/* Undo no-activity */}
          {periodStatus?.no_activity && (
            <button
              onClick={() => upsertPeriodStatus.mutate({ no_activity: false })}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
            >
              „Keine Aktivität" zurücksetzen
            </button>
          )}

          {/* Admin override */}
          {isAdmin && completeness.state !== 'complete' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed"
              onClick={() => upsertPeriodStatus.mutate({ admin_override: true })}
            >
              <CheckCircle2 className="h-4 w-4" />
              Als vollständig markieren (Admin)
            </Button>
          )}

          {/* Undo admin override */}
          {isAdmin && periodStatus?.admin_override && (
            <button
              onClick={() => upsertPeriodStatus.mutate({ admin_override: false })}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
            >
              Admin-Bestätigung zurücksetzen
            </button>
          )}

          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/documents')}>
            Belege verwalten
          </Button>
        </div>
      </div>

      {/* Exporte */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Exporte</h2>
        <div className="space-y-2">
          <Button className="w-full justify-start gap-2" onClick={handleTaxExport} disabled={exporting}>
            <FileArchive className="h-4 w-4" />
            <div className="flex flex-col items-start text-left">
              <span>{exporting ? exportProgress : 'Unterlagen für Steuerberater'}</span>
              <span className="text-xs font-normal opacity-75">Rechnungen, Belege & Zusammenfassung als ZIP</span>
            </div>
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleCsvExport}>
            <FileText className="h-4 w-4" />
            Rechnungen als CSV exportieren
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/documents')}>
            <Download className="h-4 w-4" />
            Dokumente verwalten & herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
};

const formatNumber = (n: number) => n.toFixed(2).replace('.', ',');

export default Finances;
