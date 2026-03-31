import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CircleDot, TrendingDown, Calendar, FileText } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  lead: { label: 'Lead', variant: 'secondary', color: 'bg-muted' },
  offer_sent: { label: 'Angebot gesendet', variant: 'outline', color: 'bg-accent' },
  active_client: { label: 'Aktiver Kunde', variant: 'default', color: 'bg-primary/10' },
  paused: { label: 'Pausiert', variant: 'secondary', color: 'bg-warning/10' },
  cancelled: { label: 'Gekündigt', variant: 'destructive', color: 'bg-destructive/10' },
};

const DISCOUNT_SCOPE_LABELS: Record<string, string> = {
  both: 'Setup + Monatlich',
  setup_only: 'Nur Setup-Gebühr',
  monthly_only: 'Nur Monatspreis',
};

const eurFormat = (value: number) =>
  value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface Props {
  organizationId: string;
}

interface CommercialData {
  id?: string;
  setup_fee_default: number;
  monthly_fee_default: number;
  discount_type: string | null;
  discount_scope: string;
  discount_value: number;
  final_setup_fee: number;
  final_monthly_fee: number;
  contract_duration_months: number;
  contract_start_date: string | null;
  contract_end_date: string | null;
  commercial_status: string;
  notes: string | null;
}

const DEFAULTS: CommercialData = {
  setup_fee_default: 699,
  monthly_fee_default: 399,
  discount_type: null,
  discount_scope: 'both',
  discount_value: 0,
  final_setup_fee: 699,
  final_monthly_fee: 399,
  contract_duration_months: 12,
  contract_start_date: null,
  contract_end_date: null,
  commercial_status: 'lead',
  notes: null,
};

const CommercialSettings = ({ organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CommercialData>(DEFAULTS);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existing, isLoading } = useQuery({
    queryKey: ['org-commercials', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_commercials')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing) {
      setForm({
        id: existing.id,
        setup_fee_default: Number(existing.setup_fee_default),
        monthly_fee_default: Number(existing.monthly_fee_default),
        discount_type: existing.discount_type,
        discount_scope: (existing as any).discount_scope || 'both',
        discount_value: Number(existing.discount_value ?? 0),
        final_setup_fee: Number(existing.final_setup_fee),
        final_monthly_fee: Number(existing.final_monthly_fee),
        contract_duration_months: existing.contract_duration_months,
        contract_start_date: existing.contract_start_date,
        contract_end_date: existing.contract_end_date,
        commercial_status: existing.commercial_status,
        notes: existing.notes,
      });
    }
  }, [existing]);

  // Calculate finals based on discount type + scope
  const calculated = useMemo(() => {
    const { setup_fee_default, monthly_fee_default, discount_type, discount_scope, discount_value } = form;

    if (!discount_type || !discount_value) {
      return { final_setup_fee: setup_fee_default, final_monthly_fee: monthly_fee_default };
    }

    const applySetup = discount_scope === 'both' || discount_scope === 'setup_only';
    const applyMonthly = discount_scope === 'both' || discount_scope === 'monthly_only';

    let finalSetup = setup_fee_default;
    let finalMonthly = monthly_fee_default;

    if (discount_type === 'percent') {
      const factor = 1 - Math.min(discount_value, 100) / 100;
      if (applySetup) finalSetup = Math.round(setup_fee_default * factor * 100) / 100;
      if (applyMonthly) finalMonthly = Math.round(monthly_fee_default * factor * 100) / 100;
    } else {
      if (applySetup) finalSetup = Math.max(0, setup_fee_default - discount_value);
      if (applyMonthly) finalMonthly = Math.max(0, monthly_fee_default - discount_value);
    }

    return { final_setup_fee: Math.max(0, finalSetup), final_monthly_fee: Math.max(0, finalMonthly) };
  }, [form.setup_fee_default, form.monthly_fee_default, form.discount_type, form.discount_scope, form.discount_value]);

  // Auto-calculate end date
  const calculatedEndDate = useMemo(() => {
    if (!form.contract_start_date || !form.contract_duration_months) return null;
    const start = new Date(form.contract_start_date);
    start.setMonth(start.getMonth() + form.contract_duration_months);
    return start.toISOString().split('T')[0];
  }, [form.contract_start_date, form.contract_duration_months]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (form.setup_fee_default < 0) errs.setup_fee_default = 'Setup-Gebühr darf nicht negativ sein.';
    if (form.monthly_fee_default < 0) errs.monthly_fee_default = 'Monatspreis darf nicht negativ sein.';
    if (form.contract_duration_months < 1) errs.contract_duration_months = 'Laufzeit muss mindestens 1 Monat betragen.';

    if (form.discount_type) {
      if (form.discount_value < 0) errs.discount_value = 'Rabattwert darf nicht negativ sein.';
      if (form.discount_type === 'percent' && form.discount_value > 100) {
        errs.discount_value = 'Prozentualer Rabatt darf maximal 100% betragen.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validate()) throw new Error('Ungültige Eingaben. Bitte Felder prüfen.');

      const payload = {
        organization_id: organizationId,
        setup_fee_default: form.setup_fee_default,
        monthly_fee_default: form.monthly_fee_default,
        discount_type: form.discount_type || null,
        discount_scope: form.discount_scope,
        discount_value: form.discount_type ? (form.discount_value || 0) : 0,
        final_setup_fee: calculated.final_setup_fee,
        final_monthly_fee: calculated.final_monthly_fee,
        contract_duration_months: form.contract_duration_months,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: calculatedEndDate || null,
        commercial_status: form.commercial_status,
        notes: form.notes || null,
      };

      if (form.id) {
        const { error } = await supabase
          .from('organization_commercials')
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_commercials')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-commercials', organizationId] });
      toast.success('Kommerzielle Einstellungen gespeichert');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />;
  }

  const statusInfo = STATUS_CONFIG[form.commercial_status] || STATUS_CONFIG.lead;
  const hasDiscount = !!form.discount_type && form.discount_value > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Kommerzielle Einstellungen</h3>
        <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
      </div>

      {/* Summary Block */}
      <div className={`rounded-xl border border-border p-4 space-y-3 ${statusInfo.color}`}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Finale Setup-Gebühr</p>
            <p className="text-xl font-bold text-foreground">{eurFormat(calculated.final_setup_fee)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Finaler Monatspreis</p>
            <p className="text-xl font-bold text-foreground">{eurFormat(calculated.final_monthly_fee)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {hasDiscount && (
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              {form.discount_type === 'percent' ? `${form.discount_value}%` : eurFormat(form.discount_value)}
              {' · '}
              {DISCOUNT_SCOPE_LABELS[form.discount_scope]}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {form.contract_duration_months} Monate
          </span>
          <span className="flex items-center gap-1">
            <CircleDot className="h-3 w-3" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-5">
        {/* Pricing */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Preise
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Setup-Gebühr (€)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.setup_fee_default}
                onChange={(e) => setForm((f) => ({ ...f, setup_fee_default: Number(e.target.value) }))}
              />
              {errors.setup_fee_default && <p className="mt-1 text-xs text-destructive">{errors.setup_fee_default}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Monatlicher Preis (€)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.monthly_fee_default}
                onChange={(e) => setForm((f) => ({ ...f, monthly_fee_default: Number(e.target.value) }))}
              />
              {errors.monthly_fee_default && <p className="mt-1 text-xs text-destructive">{errors.monthly_fee_default}</p>}
            </div>
          </div>
        </fieldset>

        {/* Discount */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" /> Rabatt
          </legend>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Rabattart</label>
              <Select
                value={form.discount_type || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v === 'none' ? null : v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Rabatt</SelectItem>
                  <SelectItem value="percent">Prozent</SelectItem>
                  <SelectItem value="fixed">Festbetrag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Rabattumfang</label>
              <Select
                value={form.discount_scope}
                onValueChange={(v) => setForm((f) => ({ ...f, discount_scope: v }))}
                disabled={!form.discount_type}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Setup + Monatlich</SelectItem>
                  <SelectItem value="setup_only">Nur Setup</SelectItem>
                  <SelectItem value="monthly_only">Nur Monatlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Rabattwert {form.discount_type === 'percent' ? '(%)' : '(€)'}
              </label>
              <Input
                type="number"
                min={0}
                max={form.discount_type === 'percent' ? 100 : undefined}
                step={form.discount_type === 'percent' ? 1 : 0.01}
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                disabled={!form.discount_type}
              />
              {errors.discount_value && <p className="mt-1 text-xs text-destructive">{errors.discount_value}</p>}
            </div>
          </div>
        </fieldset>

        {/* Contract */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Vertrag
          </legend>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Laufzeit (Monate)</label>
              <Input
                type="number"
                min={1}
                value={form.contract_duration_months}
                onChange={(e) => setForm((f) => ({ ...f, contract_duration_months: Number(e.target.value) }))}
              />
              {errors.contract_duration_months && <p className="mt-1 text-xs text-destructive">{errors.contract_duration_months}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Vertragsbeginn</label>
              <Input
                type="date"
                value={form.contract_start_date || ''}
                onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Vertragsende (berechnet)</label>
              <Input
                type="date"
                value={calculatedEndDate || ''}
                disabled
                className="bg-muted/50"
              />
            </div>
          </div>
        </fieldset>

        {/* Status */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CircleDot className="h-3.5 w-3.5" /> Kundenstatus
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, { label, variant }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, commercial_status: key }))}
                className="transition-all"
              >
                <Badge
                  variant={form.commercial_status === key ? variant : 'outline'}
                  className={`cursor-pointer px-3 py-1.5 text-xs ${form.commercial_status === key ? 'ring-2 ring-ring ring-offset-1' : 'opacity-60 hover:opacity-100'}`}
                >
                  {label}
                </Badge>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Interne Notizen</label>
          <Textarea
            value={form.notes || ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
};

export default CommercialSettings;
