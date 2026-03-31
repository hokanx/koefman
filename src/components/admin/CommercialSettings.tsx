import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  lead: { label: 'Lead', variant: 'secondary' },
  offer_sent: { label: 'Angebot gesendet', variant: 'outline' },
  active_client: { label: 'Aktiver Kunde', variant: 'default' },
  paused: { label: 'Pausiert', variant: 'secondary' },
  cancelled: { label: 'Gekündigt', variant: 'destructive' },
};

interface Props {
  organizationId: string;
}

interface CommercialData {
  id?: string;
  setup_fee_default: number;
  monthly_fee_default: number;
  discount_type: string | null;
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

  // Auto-calculate finals when discount changes
  const calculated = useMemo(() => {
    const { setup_fee_default, monthly_fee_default, discount_type, discount_value } = form;
    if (!discount_type || !discount_value) {
      return { final_setup_fee: setup_fee_default, final_monthly_fee: monthly_fee_default };
    }
    if (discount_type === 'percent') {
      const factor = 1 - discount_value / 100;
      return {
        final_setup_fee: Math.round(setup_fee_default * factor * 100) / 100,
        final_monthly_fee: Math.round(monthly_fee_default * factor * 100) / 100,
      };
    }
    // fixed
    return {
      final_setup_fee: Math.max(0, setup_fee_default - discount_value),
      final_monthly_fee: Math.max(0, monthly_fee_default - discount_value),
    };
  }, [form.setup_fee_default, form.monthly_fee_default, form.discount_type, form.discount_value]);

  // Auto-calculate end date
  const calculatedEndDate = useMemo(() => {
    if (!form.contract_start_date || !form.contract_duration_months) return null;
    const start = new Date(form.contract_start_date);
    start.setMonth(start.getMonth() + form.contract_duration_months);
    return start.toISOString().split('T')[0];
  }, [form.contract_start_date, form.contract_duration_months]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: organizationId,
        setup_fee_default: form.setup_fee_default,
        monthly_fee_default: form.monthly_fee_default,
        discount_type: form.discount_type || null,
        discount_value: form.discount_value || 0,
        final_setup_fee: calculated.final_setup_fee,
        final_monthly_fee: calculated.final_monthly_fee,
        contract_duration_months: form.contract_duration_months,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || calculatedEndDate || null,
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

  const statusInfo = STATUS_LABELS[form.commercial_status] || STATUS_LABELS.lead;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Kommerzielle Einstellungen</h3>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Setup-Gebühr (€)</label>
            <Input
              type="number"
              value={form.setup_fee_default}
              onChange={(e) => setForm((f) => ({ ...f, setup_fee_default: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Monatlicher Preis (€)</label>
            <Input
              type="number"
              value={form.monthly_fee_default}
              onChange={(e) => setForm((f) => ({ ...f, monthly_fee_default: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Discount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Rabattart</label>
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
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              Rabattwert {form.discount_type === 'percent' ? '(%)' : '(€)'}
            </label>
            <Input
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
              disabled={!form.discount_type}
            />
          </div>
        </div>

        {/* Final prices */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Finale Setup-Gebühr</p>
            <p className="text-lg font-bold text-foreground">{calculated.final_setup_fee.toFixed(2)} €</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Finaler Monatspreis</p>
            <p className="text-lg font-bold text-foreground">{calculated.final_monthly_fee.toFixed(2)} €</p>
          </div>
        </div>

        {/* Contract */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Laufzeit (Monate)</label>
            <Input
              type="number"
              value={form.contract_duration_months}
              onChange={(e) => setForm((f) => ({ ...f, contract_duration_months: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Vertragsbeginn</label>
            <Input
              type="date"
              value={form.contract_start_date || ''}
              onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value || null }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Vertragsende</label>
            <Input
              type="date"
              value={form.contract_end_date || calculatedEndDate || ''}
              onChange={(e) => setForm((f) => ({ ...f, contract_end_date: e.target.value || null }))}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Kundenstatus</label>
          <Select value={form.commercial_status} onValueChange={(v) => setForm((f) => ({ ...f, commercial_status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
