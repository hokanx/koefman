import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

interface Props {
  organizationId: string;
}

const OrgEmailSettings = ({ organizationId }: Props) => {
  const queryClient = useQueryClient();
  const [senderName, setSenderName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerText, setFooterText] = useState('');

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
      setFooterText(settings.footer_text || '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: organizationId,
        sender_name: senderName || null,
        reply_to_email: replyToEmail || null,
        logo_url: logoUrl || null,
        footer_text: footerText || null,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">E-Mail-Identität</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Absender-Branding für ausgehende Dokument-E-Mails. Gesendet über no-reply@koefman.de.
      </p>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Absendername</label>
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="z.B. Musterfirma GmbH" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Antwort-an-E-Mail</label>
          <Input value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} placeholder="kontakt@kunde.de" type="email" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Logo-URL</label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Footer-Text</label>
          <Textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Adresse, Steuernummer, etc." rows={3} />
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
};

export default OrgEmailSettings;
