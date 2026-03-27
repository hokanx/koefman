import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INDUSTRIES = [
  { key: 'general', label: 'Allgemein' },
  { key: 'cleaning', label: 'Gebäudereinigung' },
  { key: 'garage', label: 'Kfz / Werkstatt' },
  { key: 'consulting', label: 'Beratung' },
  { key: 'service', label: 'Kundenservice' },
  { key: 'web', label: 'Website / IT' },
];

interface TemplateItem {
  id?: string;
  title: string;
  unit_price: number;
  unit: string;
  tax_rate: number;
}

const AdminTemplates = () => {
  const qc = useQueryClient();
  const [selectedIndustry, setSelectedIndustry] = useState('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editItems, setEditItems] = useState<TemplateItem[]>([]);
  const [newName, setNewName] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['global-templates', selectedIndustry],
    queryFn: async () => {
      const { data } = await supabase
        .from('global_service_templates' as any)
        .select('*, global_service_template_items(*)')
        .eq('industry', selectedIndustry)
        .order('created_at', { ascending: true });
      return (data || []) as any[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('global_service_templates' as any).insert({
        template_name: name,
        industry: selectedIndustry,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-templates'] });
      setNewName('');
      toast.success('Vorlage erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_service_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-templates'] });
      toast.success('Vorlage gelöscht');
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async ({ id, name, items }: { id: string; name: string; items: TemplateItem[] }) => {
      const { error: nameError } = await supabase
        .from('global_service_templates' as any)
        .update({ template_name: name } as any)
        .eq('id', id);
      if (nameError) throw nameError;

      // Delete existing items and re-insert
      await supabase.from('global_service_template_items' as any).delete().eq('template_id', id);

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('global_service_template_items' as any).insert(
          items.map((item, i) => ({
            template_id: id,
            title: item.title,
            unit_price: item.unit_price,
            unit: item.unit,
            tax_rate: item.tax_rate,
            total: item.unit_price,
            quantity: 1,
            sort_order: i,
          })) as any
        );
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-templates'] });
      setEditingId(null);
      toast.success('Vorlage gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const startEditing = (tmpl: any) => {
    setEditingId(tmpl.id);
    setEditName(tmpl.template_name);
    setEditItems(
      (tmpl.global_service_template_items || []).map((i: any) => ({
        id: i.id,
        title: i.title,
        unit_price: i.unit_price,
        unit: i.unit || 'Stück',
        tax_rate: i.tax_rate || 19,
      }))
    );
  };

  const addItem = () => {
    setEditItems([...editItems, { title: '', unit_price: 0, unit: 'Stück', tax_rate: 19 }]);
  };

  const updateItem = (idx: number, field: keyof TemplateItem, value: any) => {
    const copy = [...editItems];
    copy[idx] = { ...copy[idx], [field]: value };
    setEditItems(copy);
  };

  const removeItem = (idx: number) => {
    setEditItems(editItems.filter((_, i) => i !== idx));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Globale Vorlagen</h2>
      <p className="text-sm text-muted-foreground">Standard-Vorlagen pro Branche, die neuen Kunden bereitgestellt werden.</p>

      {/* Industry tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {INDUSTRIES.map(ind => (
          <button
            key={ind.key}
            onClick={() => { setSelectedIndustry(ind.key); setEditingId(null); }}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedIndustry === ind.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {ind.label}
          </button>
        ))}
      </div>

      {/* Create new */}
      <div className="flex gap-2">
        <Input
          placeholder="Neue Vorlage..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={() => newName.trim() && createTemplate.mutate(newName.trim())}
          disabled={!newName.trim()}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> Erstellen
        </Button>
      </div>

      {/* Template list */}
      <div className="space-y-3">
        {templates.map((tmpl: any) => (
          <div key={tmpl.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            {editingId === tmpl.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Vorlagenname"
                />

                <div className="space-y-2">
                  {editItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Position"
                        className="flex-1"
                        value={item.title}
                        onChange={(e) => updateItem(i, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Preis"
                        className="w-20"
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                      />
                      <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Position
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveTemplate.mutate({ id: tmpl.id, name: editName, items: editItems.filter(i => i.title.trim()) })}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" /> Speichern
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Abbrechen
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{tmpl.template_name}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEditing(tmpl)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteTemplate.mutate(tmpl.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {(tmpl.global_service_template_items || []).length > 0 && (
                  <div className="space-y-1">
                    {tmpl.global_service_template_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.title}</span>
                        <span>{Number(item.unit_price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(tmpl.global_service_template_items || []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Keine Positionen – bearbeiten um Positionen hinzuzufügen</p>
                )}
              </>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Keine Vorlagen für diese Branche. Erstellen Sie die erste oben.
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminTemplates;
