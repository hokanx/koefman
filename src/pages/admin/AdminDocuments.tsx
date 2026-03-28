import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateDE } from '@/lib/utils';
import { FileText, Download, Search, Send, ChevronDown, CheckCircle2, AlertTriangle, Sparkles, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOCUMENT_GROUPS, ALL_SUBCATEGORIES, getCategoryInfo, STATUS_OPTIONS, getStatusInfo } from '@/lib/documentCategories';
import JSZip from 'jszip';

const getStoragePath = (fileUrl: string): string => {
  if (fileUrl.includes('/client-documents/')) {
    return fileUrl.split('/client-documents/').pop() || fileUrl;
  }
  return fileUrl;
};

const NOTIFICATION_TEMPLATES = [
  'Bitte laden Sie Ihre Belege hoch',
  'Es fehlen noch Unterlagen für diesen Monat',
  'Ihre Belege wurden geprüft',
  'Bitte laden Sie Ihre Kontoauszüge hoch',
];

const AdminDocuments = () => {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('alle');
  const [filterStatus, setFilterStatus] = useState('alle');
  const [downloading, setDownloading] = useState(false);
  const [notifyUserId, setNotifyUserId] = useState<string | null>(null);
  const [notifyMessage, setNotifyMessage] = useState('');

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-doc-clients'],
    queryFn: async () => {
      const { data: settings } = await supabase.from('business_settings').select('user_id, business_name');
      if (!settings) return [];
      const { data: profiles } = await supabase.from('profiles').select('id, email, account_status');
      const { data: docs } = await supabase.from('documents').select('user_id, status, category');

      const docCounts = (docs || []).reduce((acc: Record<string, { total: number; neu: number; hasBank: boolean }>, d: any) => {
        if (!acc[d.user_id]) acc[d.user_id] = { total: 0, neu: 0, hasBank: false };
        acc[d.user_id].total++;
        if (d.status === 'neu') acc[d.user_id].neu++;
        if (['kontoauszuege', 'kreditkarte', 'paypal_stripe', 'kassenbuch'].includes(d.category)) acc[d.user_id].hasBank = true;
        return acc;
      }, {});

      return settings.map((s: any) => {
        const profile = profiles?.find((p: any) => p.id === s.user_id);
        return {
          userId: s.user_id,
          businessName: s.business_name || 'Unbekannt',
          email: profile?.email || '',
          status: profile?.account_status || 'pending',
          docCount: docCounts[s.user_id]?.total || 0,
          newDocs: docCounts[s.user_id]?.neu || 0,
          hasBank: docCounts[s.user_id]?.hasBank || false,
        };
      }).sort((a: any, b: any) => b.newDocs - a.newDocs || b.docCount - a.docCount);
    },
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['admin-client-docs', selectedClient, filterGroup, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', selectedClient!)
        .order('created_at', { ascending: false });

      if (filterGroup !== 'alle') {
        const group = DOCUMENT_GROUPS.find(g => g.group === filterGroup);
        if (group) {
          const values = group.subcategories.map(s => s.value);
          values.push(filterGroup);
          query = query.in('category', values);
        }
      }
      if (filterStatus !== 'alle') query = query.eq('status', filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
  });

  const updateDocMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from('documents').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-client-docs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-doc-clients'] });
      toast.success('Dokument aktualisiert');
    },
  });

  const sendNotification = async () => {
    if (!notifyUserId || !notifyMessage.trim()) return;
    const { error } = await supabase.from('notifications').insert({
      user_id: notifyUserId,
      message: notifyMessage,
      type: 'info',
    });
    if (error) { toast.error('Fehler'); return; }
    toast.success('Benachrichtigung gesendet');
    setNotifyUserId(null);
    setNotifyMessage('');
  };

  const handleBulkDownload = async () => {
    if (!selectedClient || documents.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const doc of documents as any[]) {
        try {
          const path = getStoragePath(doc.file_url);
          const { data } = await supabase.storage.from('client-documents').download(path);
          if (data) zip.file(doc.file_name, data);
        } catch { /* skip */ }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      const client = clients.find((c: any) => c.userId === selectedClient);
      a.download = `Belege_${client?.businessName || 'Kunde'}_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download gestartet');
    } catch {
      toast.error('Download fehlgeschlagen');
    } finally {
      setDownloading(false);
    }
  };

  const filteredDocs = documents.filter((doc: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return doc.file_name?.toLowerCase().includes(s) || doc.description?.toLowerCase().includes(s);
  });

  const grouped = filteredDocs.reduce((acc: Record<string, any[]>, doc: any) => {
    const d = new Date(doc.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...doc, _monthLabel: label });
    return acc;
  }, {} as Record<string, any[]>);

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Completeness check per month
  const getMonthCompleteness = (docs: any[]) => {
    const hasExpense = docs.some((d: any) => {
      const info = getCategoryInfo(d.category);
      return info.group === 'ausgaben' || info.group === 'einnahmen';
    });
    const hasBank = docs.some((d: any) => {
      const info = getCategoryInfo(d.category);
      return info.group === 'bank';
    });
    if (hasExpense && hasBank) return 'complete';
    return 'incomplete';
  };

  if (!selectedClient) {
    return (
      <div className="p-4 md:p-6 animate-fade-in">
        <h1 className="mb-4 text-xl font-bold text-foreground">Belege & Dokumente – Kunden</h1>
        <div className="space-y-2">
          {clients.map((c: any) => (
            <button
              key={c.userId}
              onClick={() => setSelectedClient(c.userId)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-start transition hover:border-primary/30"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{c.businessName}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
                {!c.hasBank && c.docCount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Keine Bankbelege
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {c.newDocs > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {c.newDocs} neu
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{c.docCount} Belege</span>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
              </div>
            </button>
          ))}
          {clients.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Keine Kunden vorhanden</p>
          )}
        </div>
      </div>
    );
  }

  const selectedClientInfo = clients.find((c: any) => c.userId === selectedClient);

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button onClick={() => setSelectedClient(null)} className="text-sm text-primary hover:underline">← Zurück</button>
        <h1 className="text-lg font-bold text-foreground">{selectedClientInfo?.businessName}</h1>
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleBulkDownload} disabled={downloading || filteredDocs.length === 0}>
          <Download className="mr-1 h-4 w-4" />
          {downloading ? 'Lädt...' : `Alle herunterladen (${filteredDocs.length})`}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setNotifyUserId(selectedClient)}>
          <Send className="mr-1 h-4 w-4" />
          Benachrichtigung
        </Button>
      </div>

      {/* Notification */}
      {notifyUserId && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Benachrichtigung senden</p>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_TEMPLATES.map(t => (
              <button key={t} onClick={() => setNotifyMessage(t)}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-accent">{t}</button>
            ))}
          </div>
          <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)}
            placeholder="Nachricht..." className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground" rows={2} />
          <div className="flex gap-2">
            <Button size="sm" onClick={sendNotification} disabled={!notifyMessage.trim()}>Senden</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNotifyUserId(null); setNotifyMessage(''); }}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Beleg suchen..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setFilterGroup('alle')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${filterGroup === 'alle' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            Alle
          </button>
          {DOCUMENT_GROUPS.map(g => (
            <button key={g.group} onClick={() => setFilterGroup(g.group)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${filterGroup === g.group ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {[{ value: 'alle', label: 'Alle Status' }, ...STATUS_OPTIONS].map(s => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${filterStatus === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {docsLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filteredDocs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Keine Belege gefunden</p>
      ) : (
        <div className="space-y-6">
          {sortedMonths.map((monthKey) => {
            const docs = grouped[monthKey];
            const monthLabel = docs[0]._monthLabel;
            const completeness = getMonthCompleteness(docs);
            return (
              <div key={monthKey}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">{monthLabel} ({docs.length})</h2>
                  {completeness === 'complete' ? (
                    <span className="flex items-center gap-1 text-[10px] text-success"><CheckCircle2 className="h-3 w-3" /> Vollständig</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-warning"><AlertTriangle className="h-3 w-3" /> Unvollständig</span>
                  )}
                </div>
                <div className="space-y-2">
                  {docs.map((doc: any) => {
                    const catInfo = getCategoryInfo(doc.category);
                    const statusInfo = getStatusInfo(doc.status);
                    return (
                      <div key={doc.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          {/* Image preview for receipts */}
                          {doc.mime_type?.startsWith('image/') ? (
                            <button
                              onClick={async () => {
                                const path = getStoragePath(doc.file_url);
                                const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 300);
                                if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              }}
                              className="relative h-12 w-12 shrink-0 rounded-lg bg-muted overflow-hidden group"
                            >
                              <Eye className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition z-10" />
                              <img
                                src=""
                                alt=""
                                className="h-full w-full object-cover opacity-60 group-hover:opacity-40 transition"
                                ref={(el) => {
                                  if (!el) return;
                                  const path = getStoragePath(doc.file_url);
                                  supabase.storage.from('client-documents').createSignedUrl(path, 300).then(({ data }) => {
                                    if (data?.signedUrl) el.src = data.signedUrl;
                                  });
                                }}
                              />
                            </button>
                          ) : (
                            <FileText className="h-7 w-7 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{doc.file_name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${catInfo.color}`}>{catInfo.label}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDateDE(doc.created_at)}</span>
                              {doc.extracted_data && (
                                <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  <Sparkles className="h-2.5 w-2.5" /> Analysiert
                                </span>
                              )}
                            </div>
                            {doc.description && <p className="mt-1 text-xs text-muted-foreground truncate">{doc.description}</p>}
                          </div>
                          <button onClick={async () => {
                              const path = getStoragePath(doc.file_url);
                              const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              else toast.error('Download fehlgeschlagen');
                            }}
                            className="rounded-md p-2 text-muted-foreground hover:text-foreground shrink-0">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Extracted data display */}
                        {doc.extracted_data && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
                            <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                              <Sparkles className="h-3 w-3" /> KI-Analyse
                              {doc.extracted_data.confidence && (
                                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                  doc.extracted_data.confidence === 'high' ? 'bg-success/15 text-success' :
                                  doc.extracted_data.confidence === 'medium' ? 'bg-warning/15 text-warning' :
                                  'bg-destructive/15 text-destructive'
                                }`}>
                                  {doc.extracted_data.confidence === 'high' ? 'Sicher' :
                                   doc.extracted_data.confidence === 'medium' ? 'Mittel' : 'Unsicher'}
                                </span>
                              )}
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                              {doc.extracted_data.vendor_name && (
                                <>
                                  <span className="text-muted-foreground">Aussteller</span>
                                  <span className="font-medium text-foreground">{doc.extracted_data.vendor_name}</span>
                                </>
                              )}
                              {doc.extracted_data.receipt_date && (
                                <>
                                  <span className="text-muted-foreground">Datum</span>
                                  <span className="font-medium text-foreground">{formatDateDE(doc.extracted_data.receipt_date)}</span>
                                </>
                              )}
                              {doc.extracted_data.total_amount != null && (
                                <>
                                  <span className="text-muted-foreground">Betrag</span>
                                  <span className="font-medium text-foreground">{Number(doc.extracted_data.total_amount).toFixed(2).replace('.', ',')} €</span>
                                </>
                              )}
                              {doc.extracted_data.vat_amount != null && doc.extracted_data.vat_amount > 0 && (
                                <>
                                  <span className="text-muted-foreground">USt</span>
                                  <span className="font-medium text-foreground">{Number(doc.extracted_data.vat_amount).toFixed(2).replace('.', ',')} €</span>
                                </>
                              )}
                              {doc.extracted_data.net_amount != null && doc.extracted_data.net_amount > 0 && (
                                <>
                                  <span className="text-muted-foreground">Netto</span>
                                  <span className="font-medium text-foreground">{Number(doc.extracted_data.net_amount).toFixed(2).replace('.', ',')} €</span>
                                </>
                              )}
                            </div>
                            {doc.extracted_data.notes && (
                              <p className="text-[10px] text-muted-foreground italic">{doc.extracted_data.notes}</p>
                            )}
                          </div>
                        )}

                        {/* Admin controls */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                          <select value={doc.category}
                            onChange={(e) => updateDocMutation.mutate({ id: doc.id, updates: { category: e.target.value } })}
                            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground">
                            {DOCUMENT_GROUPS.map(g => (
                              <optgroup key={g.group} label={g.label}>
                                {g.subcategories.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <select value={doc.status}
                            onChange={(e) => updateDocMutation.mutate({ id: doc.id, updates: { status: e.target.value } })}
                            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground">
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <input type="text" placeholder="Interne Notiz..."
                            defaultValue={doc.admin_note || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (doc.admin_note || '')) {
                                updateDocMutation.mutate({ id: doc.id, updates: { admin_note: e.target.value || null } });
                              }
                            }}
                            className="flex-1 min-w-[120px] rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground" />
                        </div>
                        {doc.admin_note && (
                          <p className="text-[11px] text-muted-foreground italic">📝 {doc.admin_note}</p>
                        )}
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

export default AdminDocuments;
