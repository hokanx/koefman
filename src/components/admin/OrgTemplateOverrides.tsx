import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgTemplateStatus } from '@/hooks/useTemplateResolver';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, Building2, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const TEMPLATE_TYPES = [
  { key: 'offer', label: 'Angebot' },
  { key: 'invoice', label: 'Rechnung' },
  { key: 'contract', label: 'Vertrag' },
  { key: 'reminder', label: 'Mahnung' },
  { key: 'expense_export_note', label: 'Beleg-Export' },
  { key: 'generic_document', label: 'Allgemein' },
];



interface Props {
  organizationId: string;
}

const OrgTemplateOverrides = ({ organizationId }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useOrgTemplateStatus(organizationId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    template_type: 'offer',
    is_active: true,
    content_json: '{}',
    content_html: '',
    content_text: '',
    notes: '',
  });

  const openCreate = (type?: string) => {
    setEditingId(null);
    setForm({ name: '', template_type: type || 'offer', is_active: true, content_json: '{}', content_html: '', content_text: '', notes: '' });
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
        scope_type: 'organization',
        organization_id: organizationId,
        is_active: form.is_active,
        content_json: parsedJson,
        content_html: form.content_html || null,
        content_text: form.content_text || null,
        notes: form.notes || null,
        updated_by_user_id: user?.id || null,
      };

      // Deactivate other active org templates of same type before saving as active
      if (payload.is_active) {
        let deactivateQuery = supabase
          .from('document_templates' as any)
          .update({ is_active: false })
          .eq('template_type', payload.template_type)
          .eq('scope_type', 'organization')
          .eq('organization_id', organizationId)
          .eq('is_active', true);
        if (editingId) deactivateQuery = deactivateQuery.neq('id', editingId);
        await deactivateQuery;
      }

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
      qc.invalidateQueries({ queryKey: ['org-template-status', organizationId] });
      setDialogOpen(false);
      toast.success(editingId ? 'Override aktualisiert' : 'Override erstellt');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-template-status', organizationId] });
      toast.success('Override entfernt – globale Vorlage wird verwendet');
    },
  });

  if (isLoading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />;

  const orgTemplates = data?.orgTemplates || [];
  const globalTemplates = data?.globalTemplates || [];
  const orgTypeMap = new Map(orgTemplates.map((t: any) => [t.template_type, t]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Vorlagen</h3>
        <Button size="sm" variant="outline" onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-1" /> Override
        </Button>
      </div>

      <div className="space-y-2">
        {TEMPLATE_TYPES.map(({ key, label }) => {
          const override = orgTypeMap.get(key);
          const globalDefault = globalTemplates.find((g: any) => g.template_type === key);
          const source = override ? 'organization' : globalDefault ? 'global' : 'none';

          return (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{label}</span>
                {source === 'organization' ? (
                  <Badge variant="default" className="text-[10px]">
                    <Building2 className="h-2.5 w-2.5 mr-0.5" /> Eigene
                  </Badge>
                ) : source === 'global' ? (
                  <Badge variant="outline" className="text-[10px]">
                    <Globe className="h-2.5 w-2.5 mr-0.5" /> Global
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Keine Vorlage</Badge>
                )}
                {override && !override.is_active && (
                  <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                {override ? (
                  <>
                    <button onClick={() => openEdit(override)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(override.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => openCreate(key)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Override bearbeiten' : 'Override erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Typ</label>
              <Select value={form.template_type} onValueChange={(v) => setForm(f => ({ ...f, template_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
              <label className="text-sm">Aktiv</label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Inhalt (JSON)</label>
              <Textarea value={form.content_json} onChange={(e) => setForm(f => ({ ...f, content_json: e.target.value }))} rows={5} className="font-mono text-xs" />
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

export default OrgTemplateOverrides;
