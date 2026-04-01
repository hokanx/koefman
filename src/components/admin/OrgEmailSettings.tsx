import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Eye, EyeOff } from 'lucide-react';

interface Props {
  organizationId: string;
}

const OrgEmailSettings = ({ organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [senderName, setSenderName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['org-email-settings', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_email_settings' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (settings) {
      setSenderName(settings.sender_name || '');
      setReplyToEmail(settings.reply_to_email || '');
      setLogoUrl(settings.logo_url || '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: organizationId,
        sender_name: senderName || null,
        reply_to_email: replyToEmail || null,
        logo_url: logoUrl || null,
        footer_text: null,
        sending_mode: 'shared',
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('organization_email_settings' as any)
          .update(payload as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_email_settings' as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-email-settings', organizationId] });
      toast.success('E-Mail-Einstellungen gespeichert');
    },
    onError: (err: any) => toast.error(err.message || 'Fehler beim Speichern'),
  });

  if (isLoading) return null;

  const previewSender = senderName || 'Firmenname';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">E-Mail-Identität</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Ihre E-Mails werden automatisch über no-reply@koefman.de gesendet. Kunden antworten direkt an Ihre Adresse.
      </p>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Absendername</label>
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="z.B. Musterfirma GmbH" />
          <p className="mt-1 text-xs text-muted-foreground">Angezeigt als: {previewSender} via KÖFMAN</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Antwort-E-Mail</label>
          <Input value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} placeholder="kontakt@ihre-firma.de" type="email" />
          <p className="mt-1 text-xs text-muted-foreground">Kunden antworten an diese Adresse</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Logo-URL</label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
          <p className="mt-1 text-xs text-muted-foreground">Wird oben in der E-Mail angezeigt</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1">
            {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Vorschau
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Von:</span> {previewSender} via KÖFMAN &lt;no-reply@koefman.de&gt;
            </p>
            {replyToEmail && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Antwort an:</span> {replyToEmail}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Betreff:</span> Angebot: Beispiel-Dokument
            </p>
          </div>
          <div style={{ backgroundColor: '#000', padding: '20px' }}>
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              {logoUrl && (
                <div style={{ textAlign: 'center', paddingBottom: '10px' }}>
                  <img src={logoUrl} alt={previewSender} style={{ maxWidth: '120px', maxHeight: '40px' }} />
                </div>
              )}
              <div style={{ padding: '16px 0' }}>
                <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px' }}>Beispiel-Dokument</p>
                <p style={{ color: '#999', fontSize: '12px', margin: '0 0 4px' }}>Angebot</p>
                <p style={{ color: '#FFF', fontSize: '14px', fontWeight: 'bold', margin: '6px 0 0' }}>1.250,00 €</p>
              </div>
              <div style={{ padding: '8px 0' }}>
                <p style={{ color: '#CCC', fontSize: '12px', lineHeight: '1.5' }}>
                  Guten Tag,<br /><br />
                  Sie haben ein neues Dokument von <strong style={{ color: '#FFF' }}>{previewSender}</strong> erhalten.
                </p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <span style={{
                  display: 'inline-block',
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  padding: '10px 24px',
                  borderRadius: '6px',
                }}>
                  → ANGEBOT PRÜFEN & BESTÄTIGEN
                </span>
              </div>
              <div style={{ borderTop: '1px solid #222', paddingTop: '10px', marginTop: '10px' }}>
                <p style={{ color: '#444', fontSize: '9px', margin: 0 }}>Gesendet über KÖFMAN</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgEmailSettings;
