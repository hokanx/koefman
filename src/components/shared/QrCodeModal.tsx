import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

interface QrCodeModalProps {
  link: string;
  open: boolean;
  onClose: () => void;
}

const QrCodeModal = ({ link, open, onClose }: QrCodeModalProps) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(t.leads.linkCopied);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-foreground mb-2">{t.leads.qrTitle}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t.leads.qrDescription}</p>
        <div className="flex justify-center mb-6">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={link} size={220} level="M" />
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t.leads.copied : t.leads.copyLink}
          </button>
          <button onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrCodeModal;
