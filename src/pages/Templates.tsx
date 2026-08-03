import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, FileStack } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FormSection from '@/components/shared/FormSection';
import LineItemsEditor from '@/components/shared/LineItemsEditor';
import EmptyState from '@/components/shared/EmptyState';
import type { LineItem } from '@/types';
import type { Tables } from '@/integrations/supabase/types';

const Templates = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['service-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_templates')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['service-template-items'],
    queryFn: async () => {
      const templateIds = templates.map((t) => t.id);
      if (templateIds.length === 0) return [];
      const { data } = await supabase
        .from('service_template_items')
        .select('*')
        .in('template_id', templateIds)
        .order('sort_order');
      return data || [];
    },
    enabled: templates.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('service_templates').update({
          template_name: templateName, description,
        }).eq('id', editingId);
        if (error) throw error;

        await supabase.from('service_template_items').delete().eq('template_id', editingId);
        if (items.length > 0) {
          const { error: itemsErr } = await supabase.from('service_template_items').insert(
            items.map((item, i) => ({
              template_id: editingId, title: item.title, description: item.description,
              quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
              tax_rate: item.tax_rate, total: item.total, sort_order: i,
            }))
          );
          if (itemsErr) throw itemsErr;
        }
      } else {
        const { data: tmpl, error } = await supabase.from('service_templates').insert({
          user_id: user!.id, template_name: templateName, description,
        }).select().single();
        if (error) throw error;

        if (items.length > 0) {
          const { error: itemsErr } = await supabase.from('service_template_items').insert(
            items.map((item, i) => ({
              template_id: tmpl!.id, title: item.title, description: item.description,
              quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
              tax_rate: item.tax_rate, total: item.total, sort_order: i,
            }))
          );
          if (itemsErr) throw itemsErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      queryClient.invalidateQueries({ queryKey: ['service-template-items'] });
      toast.success(t.common.success);
      resetForm();
    },
    onError: () => toast.error(t.common.error),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      queryClient.invalidateQueries({ queryKey: ['service-template-items'] });
      toast.success(t.common.success);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTemplateName('');
    setDescription('');
    setItems([]);
  };

  const startEdit = (tmpl: Tables<'service_templates'>) => {
    setEditingId(tmpl.id);
    setTemplateName(tmpl.template_name);
    setDescription(tmpl.description || '');
    const tmplItems = allItems.filter((i) => i.template_id === tmpl.id);
    setItems(tmplItems.map((i) => ({
      id: crypto.randomUUID(), title: i.title, description: i.description || '',
      quantity: i.quantity, unit: i.unit, unit_price: i.unit_price,
      tax_rate: i.tax_rate, total: i.quantity * i.unit_price, sort_order: i.sort_order,
    })));
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    saveMutation.mutate();
  };

  const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none";

  const getTemplateItems = (templateId: string) =>
    allItems.filter((i) => i.template_id === templateId);

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t.templates.title}</h2>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t.templates.newTemplate}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 max-w-2xl space-y-4">
          <FormSection title={editingId ? t.templates.editTemplate : t.templates.newTemplate}>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.templates.templateName} *</label>
              <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.templates.description}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
            </div>
          </FormSection>

          <FormSection title={t.offers.items}>
            <LineItemsEditor items={items} onChange={setItems} labels={{
              addItem: t.offers.addItem, itemTitle: t.offers.itemTitle, description: t.offers.description,
              quantity: t.offers.quantity, unit: t.offers.unit, unitPrice: t.offers.unitPrice,
              taxRate: t.offers.taxRate, total: t.offers.total,
            }} />
          </FormSection>

          <div className="flex gap-3">
            <button type="button" onClick={resetForm}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent md:flex-none md:px-6">
              {t.common.cancel}
            </button>
            <button type="submit" disabled={saveMutation.isPending}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:flex-none md:px-6">
              {saveMutation.isPending ? t.common.loading : t.common.save}
            </button>
          </div>
        </form>
      )}

      {!showForm && templates.length === 0 && !isLoading && (
        <EmptyState icon={FileStack} title={t.templates.noTemplates} description={t.templates.noTemplatesDesc} />
      )}

      {!showForm && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((tmpl) => {
            const tmplItems = getTemplateItems(tmpl.id);
            const isExpanded = expandedId === tmpl.id;
            const total = tmplItems.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

            return (
              <div key={tmpl.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}
                    className="flex flex-1 items-start gap-2 text-start"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{tmpl.template_name}</h3>
                      {tmpl.description && <p className="mt-0.5 text-xs text-muted-foreground">{tmpl.description}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tmplItems.length} {t.offers.items} · {t.common.currency}{total.toFixed(2)}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(tmpl)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(tmpl.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && tmplItems.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {tmplItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-foreground">{item.title}</span>
                          {item.description && <span className="ml-2 text-muted-foreground">– {item.description}</span>}
                        </div>
                        <span className="text-muted-foreground">
                          {item.quantity} × {t.common.currency}{Number(item.unit_price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Templates;
