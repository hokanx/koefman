import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, FolderOpen, Search, Sparkles, Eye, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateDE } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DOCUMENT_GROUPS, getCategoryInfo, getStatusInfo } from '@/lib/documentCategories';
import { normalizeExtracted, formatAmountDE } from '@/lib/extractedDataUtils';
import DocumentPreviewModal from '@/components/documents/DocumentPreviewModal';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';

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
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('eingangsrechnungen');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

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
    } catch (err: any) {
      toast.error(err.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const filtered = documents.filter((doc: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const norm = normalizeExtracted(doc.extracted_data);
    return doc.file_name?.toLowerCase().includes(s)
      || doc.description?.toLowerCase().includes(s)
      || norm.vendor?.toLowerCase().includes(s);
  });

  const totalExpenseAmount = documents.reduce((sum: number, doc: any) => {
    const norm = normalizeExtracted(doc.extracted_data);
    return sum + (norm.gross_amount || 0);
  }, 0);

  const notExported = documents.filter((d: any) => d.status === 'neu' || d.status === 'hochgeladen').length;

  const handleDownload = async (doc: any) => {
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AUSGABEN</h1>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
          <Plus className="mr-1 h-4 w-4" /> Ausgabe hinzufügen
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{documents.length}</p>
          <p className="text-xs text-muted-foreground">Belege</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{formatAmountDE(totalExpenseAmount)}</p>
          <p className="text-xs text-muted-foreground">{isKleinunternehmer ? 'Summe' : 'Summe (brutto)'}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className={`text-2xl font-bold ${notExported > 0 ? 'text-warning' : 'text-success'}`}>{notExported}</p>
          <p className="text-xs text-muted-foreground">Nicht exportiert</p>
        </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Beleg suchen…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground" />
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p className="text-sm">Keine Belege vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: any) => {
            const catInfo = getCategoryInfo(doc.category);
            const statusInfo = getStatusInfo(doc.status);
            const norm = normalizeExtracted(doc.extracted_data);
            return (
              <div key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary/40 transition"
                onClick={() => setPreviewDoc(doc)}>
                <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {norm.vendor || doc.file_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {norm.gross_amount != null && (
                      <span className="text-sm font-medium text-foreground">{formatAmountDE(norm.gross_amount)}</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>{catInfo.label}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDateDE(doc.created_at)}</span>
                    {doc.extracted_data && (
                      <Sparkles className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleDownload(doc)}
                    className="rounded-md p-2 text-muted-foreground hover:text-foreground" title="Download">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm('Beleg löschen?')) deleteMutation.mutate(doc); }}
                    className="rounded-md p-2 text-muted-foreground hover:text-destructive" title="Löschen">
                    <Trash2 className="h-4 w-4" />
                  </button>
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
