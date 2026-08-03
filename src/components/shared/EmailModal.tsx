import { useState } from 'react';
import { Mail, Send, X, ExternalLink, Paperclip } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Checkbox } from '@/components/ui/checkbox';

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  recipientEmail?: string;
  defaultSubject: string;
  defaultBody: string;
  publicLink?: string;
  documentType: string;
  documentId: string;
  onSent?: () => void;
  /** When provided, shows a checkbox to optionally attach PDF */
  pdfGenerator?: () => Promise<string>;
  /** Filename for optional PDF attachment */
  pdfFilename?: string;
}

const EmailModal = ({
  open,
  onClose,
  recipientEmail = '',
  defaultSubject,
  defaultBody,
  publicLink,
  documentType,
  documentId,
  onSent,
  pdfGenerator,
  pdfFilename,
}: EmailModalProps) => {
  const { t } = useLanguage();
  const { activeOrganizationId } = useWorkspace();
  const [to, setTo] = useState(recipientEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [attachPdf, setAttachPdf] = useState(false);

  // Reset fields when modal opens with new defaults
  const [lastSubject, setLastSubject] = useState(defaultSubject);
  if (defaultSubject !== lastSubject) {
    setSubject(defaultSubject);
    setBody(defaultBody);
    setTo(recipientEmail);
    setLastSubject(defaultSubject);
    setAttachPdf(false);
  }

  if (!open) return null;

  const handleSend = async () => {
    if (!to) {
      toast.error('Bitte E-Mail-Adresse eingeben');
      return;
    }

    // Auto-resolve org: use workspace context, or fetch user's single org
    let orgId = activeOrganizationId;
    if (!orgId) {
      try {
        const { data: membership } = await supabase
          .from('organization_memberships')
          .select('organization_id')
          .limit(1)
          .maybeSingle();
        orgId = membership?.organization_id ?? null;
      } catch {
        // Fall through — orgId stays null and is handled by the check below
      }
    }
    if (!orgId) {
      toast.error('E-Mail konnte nicht gesendet werden. Bitte schließen Sie zuerst die Einrichtung ab.');
      return;
    }

    setSending(true);
    try {
      // Build payload
      const payload: Record<string, unknown> = {
        organization_id: orgId,
        legacy_document_id: documentId,
        legacy_document_type: documentType,
        to,
        subject,
        body,
        public_link: publicLink || undefined,
      };

      // Optionally attach PDF
      if (attachPdf && pdfGenerator && pdfFilename) {
        try {
          const pdfBase64 = await pdfGenerator();
          payload.pdfBase64 = pdfBase64;
          payload.pdfFilename = pdfFilename;
        } catch (err) {
          console.error('PDF generation error:', err);
          toast.error('PDF konnte nicht erstellt werden.');
          setSending(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke('send-org-document-email', {
        body: payload,
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('E-Mail gesendet');
      onSent?.();
      onClose();
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('E-Mail konnte nicht gesendet werden. Bitte prüfen Sie die E-Mail-Einstellungen.');
    } finally {
      setSending(false);
    }
  };

  const handleFallbackMailto = () => {
    const mailtoBody = body.replace(/\n/g, '%0A');
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${mailtoBody}`;
    window.open(mailto, '_self');
    toast.success(t.email.mailAppOpened);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl flex flex-col" style={{ maxHeight: '90dvh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">E-Mail senden</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t.email.recipient}</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t.email.recipientPlaceholder}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t.email.subject}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{t.email.message}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {publicLink && (
            <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 text-xs font-medium mb-1">🔗 Enthält Link zum Dokument</p>
              <p className="text-[11px] break-all text-muted-foreground/60">{publicLink}</p>
            </div>
          )}

          {/* Optional PDF attachment */}
          {pdfGenerator && pdfFilename && (
            <label className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border p-3 cursor-pointer">
              <Checkbox
                checked={attachPdf}
                onCheckedChange={(v) => setAttachPdf(v === true)}
              />
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                PDF zusätzlich anhängen
              </div>
            </label>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
          <button
            onClick={handleSend}
            disabled={sending || !to}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Wird gesendet...' : 'E-Mail senden'}
          </button>
          <button
            onClick={handleFallbackMailto}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            {t.email.openInMail}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
