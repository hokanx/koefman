import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, FolderOpen, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateDE } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DOCUMENT_GROUPS, getCategoryInfo } from '@/lib/documentCategories';
import { normalizeExtracted, formatAmountDE } from '@/lib/extractedDataUtils';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';
import type { Tables } from '@/integrations/supabase/types';
import type { RawExtractedData } from '@/lib/extractedDataUtils';

type DocumentRow = Tables<'documents'>;

const getStoragePath = (fileUrl: string): string => {
  if (fileUrl.includes('/client-documents/')) {
    return fileUrl.split('/client-documents/').pop() || fileUrl;
  }
  return fileUrl;
};

const Expenses = () => {
  const { user } = useAuth();
  const { effectiveUserId } = useImpersonation();
  const { isKleinunternehmer } = useOrgTaxMode();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('eingangsrechnungen');
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);

  const targetUserId = effectiveUserId || user?.id;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['expense-documents', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_url: string }) => {
      const storagePath = getStoragePath(doc.file_url);
      if (storagePath) {
        await supabase.storage.from('client-documents').remove([storagePath]);
      }
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-documents'] });
      toast.success('Beleg gelöscht');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { toast.error('Nur PDF und Bilder erlaubt'); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error('Max. 20 MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${targetUserId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('client-documents').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: insertData, error: insertError } = await supabase.from('documents').insert({
        user_id: targetUserId,
        file_name: file.name,
        file_url: path,
        file_size: file.size,
        mime_type: file.type,
        category,
        description: description || null,
      }).select('id').single();
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['expense-documents'] });
      toast.success('Beleg hochgeladen');
      setDescription('');
      setShowUpload(false);

      const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      if (isImage && insertData?.id) {
        toast.info('Beleg wird analysiert…');
        supabase.functions.invoke('analyze-receipt', {
          body: { documentId: insertData.id, fileUrl: path },
        }).then(({ data, error }) => {
          if (error) return;
          if (data?.extracted) {
            queryClient.invalidateQueries({ queryKey: ['expense-documents'] });
            toast.success('Beleg automatisch analysiert');
          }
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const totalExpenseAmount = documents.reduce((sum: number, doc) => {
    const norm = normalizeExtracted(doc.extracted_data as RawExtractedData | null);
    return sum + (norm.gross_amount || 0);
  }, 0);

  const handleDownload = async (doc: DocumentRow) => {
    try {
      const path = getStoragePath(doc.file_url);
      const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(path, 600);
      if (error || !data?.signedUrl) { toast.error('Datei konnte nicht geladen werden.'); return; }
      const resp = await fetch(data.signedUrl);
      if (!resp.ok) { toast.error('Datei nicht verfügbar'); return; }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || 'dokument';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download fehlgeschlagen');
    }
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AUSGABEN</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Für Steuer & Gewinnberechnung</p>
        </div>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
          <Plus className="mr-1 h-4 w-4" /> Ausgabe hinzufügen
        </Button>
      </div>

      {/* Single stat */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ausgaben gesamt</p>
        <p className="text-3xl font-bold text-foreground mt-1">{formatAmountDE(totalExpenseAmount)}</p>
        <p className="text-xs text-muted-foreground mt-1">{documents.length} Belege</p>
      </div>

      {/* Upload section */}
      {showUpload && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                {DOCUMENT_GROUPS.filter(g => g.group !== 'einnahmen').map(g => (
                  <optgroup key={g.group} label={g.label}>
                    {g.subcategories.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Beschreibung</label>
              <input type="text" placeholder="z.B. Telefonrechnung März" value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
            <Upload className="h-5 w-5" />
            {uploading ? 'Wird hochgeladen...' : 'PDF oder Bild auswählen'}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Erste Ausgabe hinzufügen</p>
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="mr-1 h-4 w-4" /> Ausgabe hinzufügen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const catInfo = getCategoryInfo(doc.category);
            const norm = normalizeExtracted(doc.extracted_data as RawExtractedData | null);
            return (
              <div key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 cursor-pointer hover:border-primary/40 transition"
                onClick={() => setPreviewDoc(doc)}>
                <FileText className="h-7 w-7 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {norm.vendor || doc.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {catInfo.label} · {formatDateDE(doc.created_at)}
                    {doc.extracted_data && <Sparkles className="inline h-3 w-3 ml-1 text-primary" />}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {norm.gross_amount != null && (
                    <span className="text-sm font-medium text-foreground">{formatAmountDE(norm.gross_amount)}</span>
                  )}
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDownload(doc)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground" title="Download">
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm('Beleg löschen?')) deleteMutation.mutate(doc); }} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive" title="Löschen">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        document={previewDoc}
        onUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['expense-documents'] });
          setPreviewDoc(null);
        }}
      />
    </div>
  );
};

export default Expenses;
