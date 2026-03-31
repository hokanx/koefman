import { useState } from 'react';
import { FileText, Plus, Trash2, Filter, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useOrgDocumentList,
  useCreateOrgDocument,
  useDeleteOrgDocument,
  getDocTypeLabel,
  getDocStatusLabel,
  getStatusesForType,
  getFieldConfigForType,
  getDocSummaryLine,
  formatEUR,
  type OrgDocumentType,
  type OrgDocumentStatus,
  type OrgDocument,
} from '@/hooks/useOrgDocuments';
import { formatDateDE } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import OrgDocumentDetail from '@/components/documents/OrgDocumentDetail';

const DOC_TYPES: OrgDocumentType[] = ['offer', 'invoice', 'contract', 'reminder'];

const STATUS_BADGE_MAP: Record<string, any> = {
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
  const [selectedDoc, setSelectedDoc] = useState<OrgDocument | null>(null);

  // Create form state
  const [newType, setNewType] = useState<OrgDocumentType>('offer');
  const [newTitle, setNewTitle] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPayloadExtras, setNewPayloadExtras] = useState<Record<string, string>>({});

  const { data: documents = [], isLoading } = useOrgDocumentList({ type: filterType, status: filterStatus });
  const createMutation = useCreateOrgDocument();
  const deleteMutation = useDeleteOrgDocument();

  const fieldConfig = getFieldConfigForType(newType);
  const visibleStatuses = filterType ? getStatusesForType(filterType) : undefined;

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

  const resetForm = () => {
    setNewTitle('');
    setNewRecipient('');
    setNewEmail('');
    setNewNotes('');
    setNewAmount('');
    setNewDescription('');
    setNewPayloadExtras({});
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const payload: any = {};
    if (newDescription) payload.description = newDescription;
    for (const [k, v] of Object.entries(newPayloadExtras)) {
      if (v) payload[k] = v;
    }

    createMutation.mutate(
      {
        document_type: newType,
        title: newTitle.trim(),
        recipient_name: newRecipient || undefined,
        recipient_email: newEmail || undefined,
        notes: newNotes || undefined,
        amount_total: newAmount ? parseFloat(newAmount.replace(',', '.')) : undefined,
        document_payload_json: Object.keys(payload).length > 0 ? payload : undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          resetForm();
        },
      }
    );
  };

  const handleTypeChange = (t: OrgDocumentType) => {
    setNewType(t);
    setNewPayloadExtras({});
  };

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

      {/* Type-aware create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          {/* Type selector as tabs */}
          <div className="flex gap-1.5">
            {DOC_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  newType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {getDocTypeLabel(t)}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Titel *</label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={`z.B. ${getDocTypeLabel(newType)} Webdesign`} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Empfänger</label>
              <Input value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="Firmenname / Kontakt" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">E-Mail</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="empfaenger@firma.de" />
            </div>
            {fieldConfig.showAmount && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{fieldConfig.amountLabel}</label>
                <Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0,00" type="text" inputMode="decimal" />
              </div>
            )}
          </div>

          {/* Type-specific description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{fieldConfig.descriptionLabel}</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={fieldConfig.descriptionPlaceholder}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Extra payload fields */}
          {fieldConfig.extraPayloadFields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {fieldConfig.extraPayloadFields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
                  <Input
                    type={f.type}
                    value={newPayloadExtras[f.key] ?? ''}
                    onChange={(e) => setNewPayloadExtras((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notizen</label>
            <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Interne Notizen…" />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || !newTitle.trim()}>
              {createMutation.isPending ? 'Wird erstellt…' : `${getDocTypeLabel(newType)} erstellen`}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dokument suchen…" className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <button
            onClick={() => { setFilterType(undefined); setFilterStatus(undefined); }}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            Alle Typen
          </button>
          {DOC_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setFilterStatus(undefined); }}
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
          {(visibleStatuses ?? ['draft', 'sent', 'accepted', 'paid', 'cancelled', 'archived']).map((s) => (
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
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition cursor-pointer"
              onClick={() => setSelectedDoc(doc)}
            >
              <FileText className="h-7 w-7 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{doc.title || '(Ohne Titel)'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{getDocSummaryLine(doc)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={STATUS_BADGE_MAP[doc.status] ?? 'draft'} label={getDocStatusLabel(doc.status)} />
                  {doc.recipient_name && (
                    <span className="text-[10px] text-muted-foreground">{doc.recipient_name}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{formatDateDE(doc.created_at)}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="rounded-md p-2 text-muted-foreground hover:text-primary"
                  title="Details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { if (confirm('Dokument wirklich löschen?')) deleteMutation.mutate(doc.id); }}
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

      {/* Detail modal */}
      <OrgDocumentDetail
        document={selectedDoc}
        open={!!selectedDoc}
        onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}
      />
    </div>
  );
};

export default AdminOrgDocuments;
