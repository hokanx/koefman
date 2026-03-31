import { useState } from 'react';
import { FileText, Calendar, Mail, User, Hash, Layers, StickyNote, Send, Link, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/shared/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  type OrgDocument,
  type OrgDocumentStatus,
  getDocTypeLabel,
  getDocStatusLabel,
  getStatusesForType,
  getDocSummaryLine,
  formatEUR,
  useUpdateOrgDocument,
} from '@/hooks/useOrgDocuments';
import { formatDateDE } from '@/lib/utils';

const STATUS_BADGE_MAP: Record<string, any> = {
  draft: 'draft',
  generated: 'new',
  sent: 'sent',
  accepted: 'accepted',
  paid: 'paid',
  cancelled: 'cancelled',
  archived: 'archived',
};

interface Props {
  document: OrgDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrgDocumentDetail = ({ document: doc, open, onOpenChange }: Props) => {
  const updateMutation = useUpdateOrgDocument();
  const [isSending, setIsSending] = useState(false);

  // Check for acceptance
  const { data: acceptance } = useQuery({
    queryKey: ['org-doc-acceptance', doc?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_document_acceptances' as any)
        .select('*')
        .eq('document_id', doc!.id)
        .limit(1);
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: !!doc?.id && open,
  });

  if (!doc) return null;

  const allowedStatuses = getStatusesForType(doc.document_type);
  const payload = doc.document_payload_json ?? {};
  const hasTemplate = !!doc.template_snapshot_json?.id;
  const docAny = doc as any;
  const publicToken = docAny.public_token;
  const sentAt = docAny.sent_at;

  const handleStatusChange = (newStatus: OrgDocumentStatus) => {
    updateMutation.mutate({ id: doc.id, status: newStatus } as any);
  };

  const handleSend = async () => {
    if (!doc.recipient_email) {
      toast.error('Keine Empfänger-E-Mail vorhanden');
      return;
    }
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-org-document-email', {
        body: { document_id: doc.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Dokument erfolgreich gesendet');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Senden');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    if (!publicToken) {
      toast.error('Kein öffentlicher Link vorhanden. Bitte zuerst senden.');
      return;
    }
    const url = `${window.location.origin}/document/view/${publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Link kopiert');
  };

  const handleOpenPublic = () => {
    if (!publicToken) {
      toast.error('Kein öffentlicher Link vorhanden');
      return;
    }
    window.open(`${window.location.origin}/document/view/${publicToken}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {doc.title || '(Ohne Titel)'}
          </DialogTitle>
        </DialogHeader>

        {/* Summary line */}
        <p className="text-sm font-medium text-muted-foreground">{getDocSummaryLine(doc)}</p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSending || !doc.recipient_email}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSending ? 'Senden…' : 'Senden'}
          </Button>
          {publicToken && (
            <>
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                <Link className="mr-1.5 h-3.5 w-3.5" />
                Link kopieren
              </Button>
              <Button size="sm" variant="outline" onClick={handleOpenPublic}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Öffnen
              </Button>
            </>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>{getDocTypeLabel(doc.document_type)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDateDE(doc.created_at)}</span>
          </div>
          {doc.recipient_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{doc.recipient_name}</span>
            </div>
          )}
          {doc.recipient_email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{doc.recipient_email}</span>
            </div>
          )}
          {doc.document_number && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              <span>{doc.document_number}</span>
            </div>
          )}
          {doc.amount_total != null && doc.amount_total > 0 && (
            <div className="text-sm font-semibold text-foreground">
              {formatEUR(doc.amount_total)}
            </div>
          )}
        </div>

        {/* Sent metadata */}
        {sentAt && (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <Send className="inline h-3 w-3 mr-1" />
            Gesendet am {formatDateDE(sentAt)}
          </div>
        )}

        {/* Acceptance info */}
        {acceptance && (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-1 text-primary font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              Angenommen
            </div>
            {acceptance.accepted_by_name && (
              <p className="text-muted-foreground">Von: {acceptance.accepted_by_name}</p>
            )}
            {acceptance.accepted_at && (
              <p className="text-muted-foreground">Am: {formatDateDE(acceptance.accepted_at)}</p>
            )}
          </div>
        )}

        {/* Payload extras */}
        {(payload.description || payload.due_date || payload.start_date || payload.related_invoice) && (
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
            {payload.description && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Beschreibung</p>
                <p className="text-sm text-foreground">{payload.description}</p>
              </div>
            )}
            {payload.due_date && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Fälligkeitsdatum</p>
                <p className="text-sm text-foreground">{payload.due_date}</p>
              </div>
            )}
            {payload.start_date && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Vertragsbeginn</p>
                <p className="text-sm text-foreground">{payload.start_date}</p>
              </div>
            )}
            {payload.related_invoice && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Bezug Rechnung</p>
                <p className="text-sm text-foreground">{payload.related_invoice}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {doc.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{doc.notes}</span>
          </div>
        )}

        {/* Template info */}
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {hasTemplate ? (
            <>Vorlage: <span className="font-medium text-foreground">{doc.template_snapshot_json.name}</span> (v{doc.template_snapshot_json.version_number}, {doc.template_snapshot_json.scope_type})</>
          ) : (
            'Keine Vorlage zugeordnet'
          )}
        </div>

        {/* Status control */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Status ändern</p>
          <div className="flex flex-wrap gap-1.5">
            {allowedStatuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={doc.status === s || updateMutation.isPending}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  doc.status === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                } disabled:opacity-50`}
              >
                {getDocStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrgDocumentDetail;
