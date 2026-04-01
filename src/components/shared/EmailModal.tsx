import { useState } from 'react';
import { Mail, Send, X, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';

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
  /** @deprecated Legacy PDF support – prefer publicLink */
  pdfGenerator?: () => Promise<string>;
  /** @deprecated Legacy PDF support */
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
}: EmailModalProps) => {
  const { t } = useLanguage();
  const { activeOrganizationId } = useWorkspace();
  const [to, setTo] = useState(recipientEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);

  // Reset fields when modal opens with new defaults
  const [lastSubject, setLastSubject] = useState(defaultSubject);
  if (defaultSubject !== lastSubject) {
    setSubject(defaultSubject);
    setBody(defaultBody);
    setTo(recipientEmail);
    setLastSubject(defaultSubject);
  }

  if (!open) return null;

  const handleSend = async () => {
    if (!to) {
      toast.error('Bitte E-Mail-Adresse eingeben');
      return;
    }
    if (!activeOrganizationId) {
      toast.error('E-Mail konnte nicht gesendet werden. Bitte richten Sie zuerst Ihr Geschäft ein.');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-org-document-email', {
        body: {
          organization_id: activeOrganizationId,
          legacy_document_id: documentId,
          legacy_document_type: documentType,
          to,
          subject,
          body,
          public_link: publicLink || undefined,
        },
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
              <p className="flex items-center gap-2 text-xs font-medium mb-1">🔗 Enthält Link zum Angebot</p>
              <p className="text-[11px] break-all text-muted-foreground/60">{publicLink}</p>
            </div>
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
