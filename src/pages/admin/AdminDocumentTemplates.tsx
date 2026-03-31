import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const TEMPLATE_TYPES = [
  { key: 'offer', label: 'Angebot' },
  { key: 'invoice', label: 'Rechnung' },
  { key: 'contract', label: 'Vertrag' },
  { key: 'reminder', label: 'Mahnung' },
  { key: 'expense_export_note', label: 'Beleg-Export' },
  { key: 'generic_document', label: 'Allgemein' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TEMPLATE_TYPES.map(t => [t.key, t.label]));

interface TemplateForm {
  name: string;
  template_type: string;
  is_active: boolean;
  content_json: string;
  content_html: string;
  content_text: string;
  notes: string;
}

const EMPTY_FORM: TemplateForm = {
  name: '',
  template_type: 'offer',
  is_active: true,
  content_json: '{}',
  content_html: '',
  content_text: '',
  notes: '',
};

const AdminDocumentTemplates = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-doc-templates', filterType],
    queryFn: async () => {
      let q = supabase
        .from('document_templates' as any)
        .select('*')
        .eq('scope_type', 'global')
        .is('organization_id', null)
        .order('template_type')
        .order('created_at', { ascending: false });
      if (filterType !== 'all') q = q.eq('template_type', filterType);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      template_type: t.template_type,
      is_active: t.is_active,
      content_json: JSON.stringify(t.content_json || {}, null, 2),
      content_html: t.content_html || '',
      content_text: t.content_text || '',
      notes: t.notes || '',
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name ist erforderlich');

      let parsedJson = {};
      try { parsedJson = JSON.parse(form.content_json); } catch { throw new Error('Ungültiges JSON'); }

      const payload: any = {
        name: form.name.trim(),
        template_type: form.template_type,
        scope_type: 'global',
        organization_id: null,
        is_active: form.is_active,
        content_json: parsedJson,
        content_html: form.content_html || null,
        content_text: form.content_text || null,
        notes: form.notes || null,
        updated_by_user_id: user?.id || null,
      };

      if (editingId) {
        const { error } = await supabase.from('document_templates' as any).update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        payload.created_by_user_id = user?.id || null;
        const { error } = await supabase.from('document_templates' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-doc-templates'] });
      setDialogOpen(false);
      toast.success(editingId ? 'Vorlage aktualisiert' : 'Vorlage erstellt');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-doc-templates'] });
      toast.success('Vorlage gelöscht');
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dokumentvorlagen</h2>
          <p className="text-sm text-muted-foreground">Globale Vorlagen für Angebote, Rechnungen, Verträge und mehr.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Vorlage
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${filterType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
        >
          Alle
        </button>
        {TEMPLATE_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setFilterType(t.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${filterType === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="space-y-3">
        {templates.map((t: any) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-foreground">{t.name}</p>
                <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[t.template_type] || t.template_type}</Badge>
                {t.is_active ? (
                  <Badge variant="default" className="text-[10px]"><Check className="h-2.5 w-2.5 mr-0.5" />Aktiv</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteMutation.mutate(t.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {t.notes && <p className="mt-1 text-xs text-muted-foreground">{t.notes}</p>}
            <p className="mt-1 text-[10px] text-muted-foreground">v{t.version_number}</p>
          </div>
        ))}

        {templates.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Keine globalen Vorlagen{filterType !== 'all' ? ` für "${TYPE_LABELS[filterType]}"` : ''}. Erstellen Sie die erste.
          </p>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Standard-Rechnung" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Vorlagentyp</label>
              <Select value={form.template_type} onValueChange={(v) => setForm(f => ({ ...f, template_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(t => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <label className="text-sm">Aktiv</label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Inhalt (JSON)</label>
              <Textarea value={form.content_json} onChange={(e) => setForm(f => ({ ...f, content_json: e.target.value }))} rows={6} className="font-mono text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">HTML (optional)</label>
              <Textarea value={form.content_html} onChange={(e) => setForm(f => ({ ...f, content_html: e.target.value }))} rows={3} className="font-mono text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Text (optional)</label>
              <Textarea value={form.content_text} onChange={(e) => setForm(f => ({ ...f, content_text: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notizen</label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocumentTemplates;
