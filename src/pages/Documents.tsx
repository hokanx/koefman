import { useState } from 'react';
import { Upload, FileText, Trash2, Download, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateDE } from '@/lib/utils';

const CATEGORIES = [
  { value: 'einnahmen', label: 'Einnahmen', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'ausgaben', label: 'Ausgaben', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'vertraege', label: 'Verträge', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'sonstiges', label: 'Sonstiges', color: 'bg-muted text-muted-foreground' },
];

const Documents = () => {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating, impersonatedUser } = useImpersonation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('alle');
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('sonstiges');

  const targetUserId = effectiveUserId || user?.id;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', targetUserId, filter],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('created_at', { ascending: false });
      if (filter !== 'alle') query = query.eq('category', filter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_url: string }) => {
      // Extract path from URL
      const urlParts = doc.file_url.split('/client-documents/');
      if (urlParts[1]) {
        await supabase.storage.from('client-documents').remove([urlParts[1]]);
      }
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Dokument gelöscht');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur PDF und Bilder erlaubt');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Maximale Dateigröße: 20 MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${targetUserId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('client-documents').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(path);

      const { error: insertError } = await supabase.from('documents').insert({
        user_id: targetUserId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        category,
        description: description || null,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Dokument hochgeladen');
      setDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[3];

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="animate-fade-in p-4 md:p-6">
      {isImpersonating && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          Ansicht für: <strong>{impersonatedUser?.businessName}</strong>
        </div>
      )}

      <h1 className="mb-4 text-xl font-bold text-foreground">Belege & Dokumente</h1>

      {/* Upload section */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Neues Dokument hochladen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
          <Upload className="h-5 w-5" />
          {uploading ? 'Wird hochgeladen...' : 'PDF oder Bild auswählen'}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {[{ value: 'alle', label: 'Alle' }, ...CATEGORIES].map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === c.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p className="text-sm">Keine Dokumente vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => {
            const catInfo = getCategoryInfo(doc.category);
            return (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>{catInfo.label}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDateDE(doc.created_at)}</span>
                    {doc.file_size && <span className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</span>}
                  </div>
                  {doc.description && <p className="mt-1 text-xs text-muted-foreground truncate">{doc.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="rounded-md p-2 text-muted-foreground hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </a>
                  <button onClick={() => { if (confirm('Dokument wirklich löschen?')) deleteMutation.mutate(doc); }}
                    className="rounded-md p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Documents;
