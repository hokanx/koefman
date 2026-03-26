import { useState } from 'react';
import { Mail, Download, ExternalLink, X } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
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
}: EmailModalProps) => {
  const { t } = useLanguage();
  const [to, setTo] = useState(recipientEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [downloading, setDownloading] = useState(false);

  // Reset fields when modal opens with new defaults
  const [lastSubject, setLastSubject] = useState(defaultSubject);
  if (defaultSubject !== lastSubject) {
    setSubject(defaultSubject);
    setBody(defaultBody);
    setTo(recipientEmail);
    setLastSubject(defaultSubject);
  }

  if (!open) return null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const pdfBase64 = await pdfGenerator();
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.email.pdfDownloaded);
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error(t.common.error);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenMailApp = () => {
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
            <h3 className="font-semibold text-foreground">{t.email.prepareEmail}</h3>
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
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              📎 {pdfFilename}
            </p>
            <p className="mt-1 text-xs">{t.email.attachmentHint}</p>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? t.common.generating : t.email.downloadPdf}
          </button>
          <button
            onClick={handleOpenMailApp}
            disabled={!to}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
