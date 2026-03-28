import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, FolderOpen, Search, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateDE } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DOCUMENT_GROUPS, getCategoryInfo, getStatusInfo } from '@/lib/documentCategories';

const getStoragePath = (fileUrl: string): string => {
  if (fileUrl.includes('/client-documents/')) {
    return fileUrl.split('/client-documents/').pop() || fileUrl;
  }
  return fileUrl;
};

const Documents = () => {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating, impersonatedUser } = useImpersonation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterGroup, setFilterGroup] = useState<string>('alle');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('eingangsrechnungen');

  const targetUserId = effectiveUserId || user?.id;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', targetUserId, filterGroup],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', targetUserId!)
        .order('created_at', { ascending: false });

      if (filterGroup !== 'alle') {
        // Get all subcategory values for this group
        const group = DOCUMENT_GROUPS.find(g => g.group === filterGroup);
        if (group) {
          const values = group.subcategories.map(s => s.value);
          // Also include legacy value
          values.push(filterGroup);
          query = query.in('category', values);
        }
      }

      const { data, error } = await query;
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

      const { error: insertError } = await supabase.from('documents').insert({
        user_id: targetUserId,
        file_name: file.name,
        file_url: path,
        file_size: file.size,
        mime_type: file.type,
        category,
        description: description || null,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Beleg hochgeladen');
      setDescription('');
      setShowUpload(false);
    } catch (err: any) {
      toast.error(err.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = documents.filter((doc: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return doc.file_name?.toLowerCase().includes(s) || doc.description?.toLowerCase().includes(s);
  });

  const grouped = filtered.reduce((acc: Record<string, any[]>, doc: any) => {
    const d = new Date(doc.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...doc, _monthLabel: label });
    return acc;
  }, {} as Record<string, any[]>);

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="animate-fade-in p-4 md:p-6">
      {isImpersonating && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          Ansicht für: <strong>{impersonatedUser?.businessName}</strong>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Belege & Dokumente</h1>
        <Button onClick={() => setShowUpload(!showUpload)} size="sm">
          <Upload className="mr-1 h-4 w-4" />
          Beleg hochladen
        </Button>
      </div>

      {/* Guidance hints */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Angebote und Ausgangsrechnungen werden automatisch erfasst und müssen nicht hochgeladen werden.</p>
          <p>Laden Sie hier Belege, Kontoauszüge und Eingangsrechnungen hoch.</p>
        </div>
      </div>

      {/* Upload section */}
      {showUpload && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Beschreibung (optional)</label>
              <input
                type="text"
                placeholder="z.B. Telefonrechnung März"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
            <Upload className="h-5 w-5" />
            {uploading ? 'Wird hochgeladen...' : 'PDF oder Bild auswählen'}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}

      {/* Search + Group Filter */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Beleg suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterGroup('alle')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filterGroup === 'alle' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Alle
          </button>
          {DOCUMENT_GROUPS.map(g => (
            <button
              key={g.group}
              onClick={() => setFilterGroup(g.group)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filterGroup === g.group ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document list grouped by month */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p className="text-sm">Keine Belege vorhanden</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthKey) => {
            const docs = grouped[monthKey];
            const monthLabel = docs[0]._monthLabel;
            return (
              <div key={monthKey}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{monthLabel} ({docs.length})</h2>
                <div className="space-y-2">
                  {docs.map((doc: any) => {
                    const catInfo = getCategoryInfo(doc.category);
                    const statusInfo = getStatusInfo(doc.status);
                    return (
                      <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>{catInfo.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDateDE(doc.created_at)}</span>
                            {doc.file_size && <span className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</span>}
                          </div>
                          {doc.description && <p className="mt-1 text-xs text-muted-foreground truncate">{doc.description}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button onClick={async () => {
                              const path = getStoragePath(doc.file_url);
                              const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              else toast.error('Download fehlgeschlagen');
                            }}
                            className="rounded-md p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground">
                            <Download className="h-5 w-5" />
                          </button>
                          <button onClick={() => { if (confirm('Beleg wirklich löschen?')) deleteMutation.mutate(doc); }}
                            className="rounded-md p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
