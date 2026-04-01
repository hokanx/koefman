import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tag } from 'lucide-react';

export interface DiscountData {
  enabled: boolean;
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'setup' | 'monthly' | 'both';
  duration_months: number | null;
}

interface DiscountEditorProps {
  discount: DiscountData;
  onChange: (d: DiscountData) => void;
}

const DiscountEditor = ({ discount, onChange }: DiscountEditorProps) => {
  const update = (patch: Partial<DiscountData>) => onChange({ ...discount, ...patch });

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Rabatt</span>
        </div>
        <Switch checked={discount.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </div>

      {discount.enabled && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Art</Label>
              <Select value={discount.type} onValueChange={(v) => update({ type: v as 'percentage' | 'fixed' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Prozent (%)</SelectItem>
                  <SelectItem value="fixed">Festbetrag (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Wert</Label>
              <Input
                type="number"
                min={0}
                step={discount.type === 'percentage' ? 1 : 0.01}
                value={discount.value || ''}
                onChange={(e) => update({ value: parseFloat(e.target.value) || 0 })}
                placeholder={discount.type === 'percentage' ? '10' : '50.00'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Anwendung auf</Label>
              <Select value={discount.scope} onValueChange={(v) => update({ scope: v as 'setup' | 'monthly' | 'both' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Gesamtbetrag</SelectItem>
                  <SelectItem value="setup">Nur Setup</SelectItem>
                  <SelectItem value="monthly">Nur monatlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dauer (Monate)</Label>
              <Input
                type="number"
                min={0}
                value={discount.duration_months ?? ''}
                onChange={(e) => update({ duration_months: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Unbegrenzt"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountEditor;

/** Calculate discounted grand total */
export const applyDiscount = (grandTotal: number, discount: DiscountData | null): number => {
  if (!discount?.enabled || !discount.value) return grandTotal;
  if (discount.type === 'percentage') {
    return Math.max(0, grandTotal * (1 - discount.value / 100));
  }
  return Math.max(0, grandTotal - discount.value);
};

/** Format discount description for display */
export const formatDiscountLabel = (discount: DiscountData | null): string | null => {
  if (!discount?.enabled || !discount.value) return null;
  const valueStr = discount.type === 'percentage' ? `${discount.value}%` : `${discount.value.toFixed(2)} €`;
  let label = `Rabatt: ${valueStr}`;
  if (discount.duration_months) {
    label += ` (erste ${discount.duration_months} Monate)`;
  }
  return label;
};
