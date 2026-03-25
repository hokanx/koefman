import { useState } from 'react';
import { Mail, Send, X } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  recipientEmail?: string;
  defaultSubject: string;
  defaultBody: string;
  pdfGenerator: () => Promise<string>; // returns base64 PDF
  pdfFilename: string;
  documentType: string;
  documentId: string;
  onSent?: () => void;
}

const EmailModal = ({
  open,
  onClose,
  recipientEmail = '',
  defaultSubject,
  defaultBody,
  pdfGenerator,
  pdfFilename,
  documentType,
  documentId,
  onSent,
}: EmailModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
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
    if (!to || !subject || !user) {
      toast.error(t.common.error);
      return;
    }

    setSending(true);
    try {
      // Generate PDF as base64
      const pdfBase64 = await pdfGenerator();

      const { data, error } = await supabase.functions.invoke('send-document-email', {
        body: {
          to,
          subject,
          body,
          pdfBase64,
          pdfFilename,
          documentType,
          documentId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(t.email.sent);
      onSent?.();
      onClose();
    } catch (err) {
      console.error('Email send error:', err);
      toast.error(t.email.sendError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t.email.sendByEmail}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 p-4">
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
              rows={6}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              📎 {pdfFilename}
            </p>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <button
            onClick={handleSend}
            disabled={sending || !to}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? t.email.sending : t.email.send}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
