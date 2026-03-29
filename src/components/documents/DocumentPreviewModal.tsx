import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles, Save, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateDE } from '@/lib/utils';
import { getCategoryInfo, getStatusInfo, DOCUMENT_GROUPS, STATUS_OPTIONS } from '@/lib/documentCategories';
import { useAdmin } from '@/hooks/useAdmin';

interface ExtractedData {
  vendor?: string;
  date?: string;
  net_amount?: number;
  vat_amount?: number;
  gross_amount?: number;
  suggested_category?: string;
  description?: string;
  [key: string]: any;
}

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any | null;
  onUpdate?: () => void;
}

const getStoragePath = (fileUrl: string): string => {
  if (fileUrl.includes('/client-documents/')) {
    return fileUrl.split('/client-documents/').pop() || fileUrl;
  }
  return fileUrl;
};

const DocumentPreviewModal = ({ open, onOpenChange, document: doc, onUpdate }: DocumentPreviewModalProps) => {
  const { isAdmin } = useAdmin();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Admin edit state
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editExtracted, setEditExtracted] = useState<ExtractedData>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doc || !open) {
      setPreviewUrl(null);
      return;
    }
    setEditCategory(doc.category || '');
    setEditStatus(doc.status || 'neu');
    setEditNote(doc.admin_note || '');
    setEditExtracted((doc.extracted_data as ExtractedData) || {});

    const loadPreview = async () => {
      setLoading(true);
      try {
        const path = getStoragePath(doc.file_url);
        const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(path, 600);
        if (error || !data?.signedUrl) throw error;
        setPreviewUrl(data.signedUrl);
      } catch {
        setPreviewUrl(null);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [doc, open]);

  if (!doc) return null;

  const isImage = doc.mime_type?.startsWith('image/');
  const isPdf = doc.mime_type === 'application/pdf';
  const extracted = (doc.extracted_data as ExtractedData) || {};
  const hasExtracted = Object.keys(extracted).length > 0;
  const catInfo = getCategoryInfo(doc.category);
  const statusInfo = getStatusInfo(doc.status);

  const handleDownload = async () => {
    try {
      const path = getStoragePath(doc.file_url);
      const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(path, 600);
      if (error || !data?.signedUrl) { toast.error('Download fehlgeschlagen'); return; }
      const resp = await fetch(data.signedUrl);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('documents').update({
        category: editCategory,
        status: editStatus,
        admin_note: editNote || null,
        extracted_data: Object.keys(editExtracted).length > 0 ? editExtracted as any : null,
      }).eq('id', doc.id);
      if (error) throw error;
      toast.success('Dokument aktualisiert');
      onUpdate?.();
    } catch {
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number | undefined) => n != null ? `${n.toFixed(2)} €` : '–';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="truncate">{doc.file_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${catInfo.color}`}>{catInfo.label}</span>
            <span className={`rounded-full px-2 py-0.5 font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            <span className="text-muted-foreground">{formatDateDE(doc.created_at)}</span>
            {doc.description && <span className="text-muted-foreground">· {doc.description}</span>}
          </div>

          {/* Preview area */}
          <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : previewUrl && isImage ? (
              <img src={previewUrl} alt={doc.file_name} className="w-full max-h-[400px] object-contain" />
            ) : previewUrl && isPdf ? (
              <iframe src={previewUrl} className="w-full h-[400px]" title={doc.file_name} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p className="text-sm">Vorschau nicht verfügbar</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Herunterladen
            </Button>
          </div>

          {/* Extracted data section */}
          {hasExtracted && !isAdmin && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Erkannte Informationen
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {extracted.vendor && (
                  <div><span className="text-muted-foreground text-xs">Anbieter</span><p className="font-medium">{extracted.vendor}</p></div>
                )}
                {extracted.date && (
                  <div><span className="text-muted-foreground text-xs">Datum</span><p className="font-medium">{extracted.date}</p></div>
                )}
                {extracted.net_amount != null && (
                  <div><span className="text-muted-foreground text-xs">Netto</span><p className="font-medium">{fmt(extracted.net_amount)}</p></div>
                )}
                {extracted.vat_amount != null && (
                  <div><span className="text-muted-foreground text-xs">Umsatzsteuer</span><p className="font-medium">{fmt(extracted.vat_amount)}</p></div>
                )}
                {extracted.gross_amount != null && (
                  <div><span className="text-muted-foreground text-xs">Brutto</span><p className="font-medium">{fmt(extracted.gross_amount)}</p></div>
                )}
                {extracted.suggested_category && (
                  <div><span className="text-muted-foreground text-xs">Vorgeschlagene Kategorie</span><p className="font-medium">{getCategoryInfo(extracted.suggested_category).label}</p></div>
                )}
              </div>
            </div>
          )}

          {/* Admin review section */}
          {isAdmin && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Admin-Prüfung</h3>

              {/* Editable extracted fields */}
              {hasExtracted && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Erkannte Daten (bearbeitbar)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Anbieter</label>
                      <input value={editExtracted.vendor || ''} onChange={e => setEditExtracted(p => ({ ...p, vendor: e.target.value }))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Datum</label>
                      <input value={editExtracted.date || ''} onChange={e => setEditExtracted(p => ({ ...p, date: e.target.value }))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Netto (€)</label>
                      <input type="number" step="0.01" value={editExtracted.net_amount ?? ''} onChange={e => setEditExtracted(p => ({ ...p, net_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">USt (€)</label>
                      <input type="number" step="0.01" value={editExtracted.vat_amount ?? ''} onChange={e => setEditExtracted(p => ({ ...p, vat_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Brutto (€)</label>
                      <input type="number" step="0.01" value={editExtracted.gross_amount ?? ''} onChange={e => setEditExtracted(p => ({ ...p, gross_amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Kategorie</label>
                  <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm">
                    {DOCUMENT_GROUPS.map(g => (
                      <optgroup key={g.group} label={g.label}>
                        {g.subcategories.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm">
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Interne Notiz</label>
                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2}
                  placeholder="Notiz für interne Verwendung…"
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm resize-none" />
              </div>

              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> {saving ? 'Speichern…' : 'Änderungen speichern'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
