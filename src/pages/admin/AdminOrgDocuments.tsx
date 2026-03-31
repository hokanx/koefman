import { useState } from 'react';
import { FileText, Plus, Trash2, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useOrgDocumentList,
  useCreateOrgDocument,
  useDeleteOrgDocument,
  getDocTypeLabel,
  getDocStatusLabel,
  type OrgDocumentType,
  type OrgDocumentStatus,
} from '@/hooks/useOrgDocuments';
import { formatDateDE } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';

const DOC_TYPES: OrgDocumentType[] = ['offer', 'invoice', 'contract', 'reminder'];
const DOC_STATUSES: OrgDocumentStatus[] = ['draft', 'generated', 'sent', 'accepted', 'paid', 'cancelled', 'archived'];

const STATUS_MAP: Record<string, any> = {
  draft: 'draft',
  generated: 'new',
  sent: 'sent',
  accepted: 'accepted',
  paid: 'paid',
  cancelled: 'cancelled',
  archived: 'archived',
};

const AdminOrgDocuments = () => {
  const { activeOrganization, activeOrganizationId } = useWorkspace();
  const [filterType, setFilterType] = useState<OrgDocumentType | undefined>();
  const [filterStatus, setFilterStatus] = useState<OrgDocumentStatus | undefined>();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState<OrgDocumentType>('offer');
  const [newTitle, setNewTitle] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const { data: documents = [], isLoading } = useOrgDocumentList({ type: filterType, status: filterStatus });
  const createMutation = useCreateOrgDocument();
  const deleteMutation = useDeleteOrgDocument();

  if (!activeOrganizationId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <FileText className="h-10 w-10" />
        <p className="text-sm">Bitte wählen Sie zuerst einen Workspace aus.</p>
      </div>
    );
  }

  const filtered = documents.filter((doc) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(s) ||
      doc.recipient_name?.toLowerCase().includes(s) ||
      doc.document_number?.toLowerCase().includes(s)
    );
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(
      {
        document_type: newType,
        title: newTitle.trim(),
        recipient_name: newRecipient || undefined,
        recipient_email: newEmail || undefined,
        notes: newNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewTitle('');
          setNewRecipient('');
          setNewEmail('');
          setNewNotes('');
        },
      }
    );
  };

  const formatEUR = (v: number | null) =>
    v != null
      ? v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : '–';

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dokumente</h1>
          {activeOrganization && (
            <p className="text-sm text-muted-foreground">{activeOrganization.name}</p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-1 h-4 w-4" /> Neues Dokument
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Dokumenttyp</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as OrgDocumentType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{getDocTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Titel</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="z.B. Angebot Webdesign" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Empfänger</label>
              <Input value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="Firmenname / Kontakt" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">E-Mail</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="empfaenger@firma.de" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notizen</label>
            <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Interne Notizen…" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || !newTitle.trim()}>
              {createMutation.isPending ? 'Wird erstellt…' : 'Erstellen'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dokument suchen…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <button
            onClick={() => setFilterType(undefined)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            Alle Typen
          </button>
          {DOC_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {getDocTypeLabel(t)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterStatus(undefined)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${!filterStatus ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            Alle Status
          </button>
          {DOC_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {getDocStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FileText className="h-10 w-10" />
          <p className="text-sm">Keine Dokumente vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition"
            >
              <FileText className="h-7 w-7 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{doc.title || '(Ohne Titel)'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {getDocTypeLabel(doc.document_type)}
                  </span>
                  <StatusBadge status={STATUS_MAP[doc.status] ?? 'draft'} label={getDocStatusLabel(doc.status)} />
                  {doc.recipient_name && (
                    <span className="text-[10px] text-muted-foreground">· {doc.recipient_name}</span>
                  )}
                  {doc.document_number && (
                    <span className="text-[10px] text-muted-foreground">#{doc.document_number}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{formatDateDE(doc.created_at)}</span>
                  <span className="text-[10px] font-medium text-foreground">{formatEUR(doc.amount_total)}</span>
                </div>
                {doc.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{doc.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    if (confirm('Dokument wirklich löschen?')) deleteMutation.mutate(doc.id);
                  }}
                  className="rounded-md p-2 text-muted-foreground hover:text-destructive"
                  title="Löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrgDocuments;
