import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatEUR } from '@/lib/utils';
import TemplatePicker from './TemplatePicker';
import type { LineItem } from '@/types';

interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  showTemplatePicker?: boolean;
  defaultTaxRate?: number;
  defaultUnit?: string;
  labels: {
    addItem: string;
    itemTitle: string;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    taxRate: string;
    total: string;
  };
}

const LineItemsEditor = ({ items, onChange, labels, showTemplatePicker = false, defaultTaxRate = 19, defaultUnit = 'Pauschal' }: LineItemsEditorProps) => {
  const { t } = useLanguage();

  const addItem = () => {
    onChange([...items, {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      quantity: 1,
      unit: defaultUnit,
      unit_price: 0,
      tax_rate: defaultTaxRate,
      total: 0,
      sort_order: items.length,
    }]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      newItem.total = newItem.quantity * newItem.unit_price;
      return newItem;
    });
    onChange(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.total * item.tax_rate) / 100, 0);
  const grandTotal = subtotal + taxTotal;

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            value={item.title}
            onChange={(e) => updateItem(item.id, 'title', e.target.value)}
            placeholder={labels.itemTitle}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            value={item.description || ''}
            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
            placeholder={labels.description}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.quantity}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.unit}</label>
              <select
                value={item.unit}
                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="Stück">{t.common.piece}</option>
                <option value="Stunde">{t.common.hour}</option>
                <option value="Meter">{t.common.meter}</option>
                <option value="m²">{t.common.sqm}</option>
                <option value="Liter">{t.common.liter}</option>
                <option value="kg">{t.common.kg}</option>
                <option value="Pauschal">{t.common.flat}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.unitPrice}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{labels.taxRate}</label>
              <select
                value={item.tax_rate}
                onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value))}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
            </div>
          </div>
          <div className="text-end text-sm font-medium text-foreground">
            {labels.total}: {formatEUR(item.total)}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={addItem}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          {labels.addItem}
        </button>
        {showTemplatePicker && (
          <TemplatePicker onInsert={(newItems) => onChange([...items, ...newItems.map((ni, i) => ({ ...ni, sort_order: items.length + i }))])} />
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t.offers.subtotal}</span>
            <span>{formatEUR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t.offers.taxTotal}</span>
            <span>{formatEUR(taxTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold text-foreground">
            <span>{t.offers.grandTotal}</span>
            <span>{formatEUR(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineItemsEditor;
