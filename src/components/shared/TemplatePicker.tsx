import { useState } from 'react';
import { FileStack, X } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LineItem } from '@/types';
import type { Tables } from '@/integrations/supabase/types';

interface TemplatePickerProps {
  onInsert: (items: LineItem[]) => void;
}

const TemplatePicker = ({ onInsert }: TemplatePickerProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['service-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_templates')
        .select('*')
        .eq('user_id', user!.id)
        .order('template_name');
      return data || [];
    },
    enabled: !!user && open,
  });

  const handleSelect = async (templateId: string) => {
    const { data: templateItems } = await supabase
      .from('service_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order');

    if (templateItems && templateItems.length > 0) {
      const newItems: LineItem[] = templateItems.map((i: Tables<'service_template_items'>, idx: number) => ({
        id: crypto.randomUUID(),
        title: i.title,
        description: i.description || '',
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate,
        total: i.quantity * i.unit_price,
        sort_order: idx,
      }));
      onInsert(newItems);
    }
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <FileStack className="h-4 w-4" />
        {t.templates.addTemplate}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{t.templates.selectTemplate}</span>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t.templates.noTemplates}</p>
      ) : (
        <div className="space-y-1">
          {templates.map((tmpl: Tables<'service_templates'>) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleSelect(tmpl.id)}
              className="w-full rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent"
            >
              <span className="font-medium text-foreground">{tmpl.template_name}</span>
              {tmpl.description && <span className="ml-2 text-muted-foreground">– {tmpl.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatePicker;
