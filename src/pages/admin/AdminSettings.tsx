import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const AdminSettings = () => {
  const { user } = useAuth();
  const { activeOrganization, activeOrganizationId } = useWorkspace();
  const queryClient = useQueryClient();

  // Email settings
  const { data: emailSettings } = useQuery({
    queryKey: ['org-email-settings', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) return null;
      const { data } = await supabase.from('organization_email_settings').select('*').eq('organization_id', activeOrganizationId).maybeSingle();
      return data;
    },
    enabled: !!activeOrganizationId,
  });

  // Business settings
  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Tax mode from org
  const taxMode = activeOrganization?.tax_mode || 'standard';

  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [footerText, setFooterText] = useState('');
  const [defaultOfferIntro, setDefaultOfferIntro] = useState('');
  const [defaultOfferFooter, setDefaultOfferFooter] = useState('');
  const [defaultInvoiceIntro, setDefaultInvoiceIntro] = useState('');
  const [defaultInvoiceFooter, setDefaultInvoiceFooter] = useState('');
  const [defaultClosing, setDefaultClosing] = useState('');

  useEffect(() => {
    if (emailSettings) {
      setSenderName(emailSettings.sender_name || '');
      setReplyTo(emailSettings.reply_to_email || '');
      setFooterText(emailSettings.footer_text || '');
    }
  }, [emailSettings]);

  useEffect(() => {
    if (settings) {
      setDefaultOfferIntro((settings as any).default_offer_intro_text || '');
      setDefaultOfferFooter((settings as any).default_offer_footer_text || '');
      setDefaultInvoiceIntro((settings as any).default_invoice_intro_text || '');
      setDefaultInvoiceFooter((settings as any).default_invoice_footer_text || '');
      setDefaultClosing((settings as any).default_closing_text || '');
    }
  }, [settings]);

  const saveEmailSettings = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) return;
      const payload = {
        organization_id: activeOrganizationId,
        sender_name: senderName,
        reply_to_email: replyTo,
        footer_text: footerText,
      };
      if (emailSettings) {
        await supabase.from('organization_email_settings').update(payload).eq('id', emailSettings.id);
      } else {
        await supabase.from('organization_email_settings').insert(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-email-settings'] });
      toast.success('E-Mail-Einstellungen gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const saveDefaultTexts = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      await supabase.from('business_settings').update({
        default_offer_intro_text: defaultOfferIntro,
        default_offer_footer_text: defaultOfferFooter,
        default_invoice_intro_text: defaultInvoiceIntro,
        default_invoice_footer_text: defaultInvoiceFooter,
        default_closing_text: defaultClosing,
      } as any).eq('user_id', user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success('Standardtexte gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const toggleTaxMode = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) return;
      const newMode = taxMode === 'kleinunternehmer' ? 'standard' : 'kleinunternehmer';
      await supabase.from('organizations').update({ tax_mode: newMode }).eq('id', activeOrganizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-organization'] });
      toast.success('Steuermodus geändert');
    },
  });

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-bold text-foreground">Einstellungen</h2>

      {/* Tax Mode */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Steuermodus</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Kleinunternehmerregelung (§19 UStG)</p>
            <p className="text-xs text-muted-foreground">Keine MwSt. auf Dokumenten</p>
          </div>
          <Switch
            checked={taxMode === 'kleinunternehmer'}
            onCheckedChange={() => toggleTaxMode.mutate()}
          />
        </div>
      </div>

      {/* Email Identity */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">E-Mail-Identität</h3>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Absendername</Label>
            <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="KÖFMAN" />
          </div>
          <div>
            <Label className="text-xs">Antwort-E-Mail</Label>
            <Input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="kontakt@firma.de" />
          </div>
          <div>
            <Label className="text-xs">E-Mail Footer</Label>
            <Textarea value={footerText} onChange={e => setFooterText(e.target.value)} rows={2} className="resize-none" placeholder="Footer-Text für E-Mails" />
          </div>
        </div>
        <Button size="sm" onClick={() => saveEmailSettings.mutate()} disabled={saveEmailSettings.isPending}>
          {saveEmailSettings.isPending ? 'Wird gespeichert…' : 'Speichern'}
        </Button>
      </div>

      {/* Default Texts */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Standardtexte</h3>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Angebot – Einleitung</Label>
            <Textarea value={defaultOfferIntro} onChange={e => setDefaultOfferIntro(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>
          <div>
            <Label className="text-xs">Angebot – Fußtext</Label>
            <Textarea value={defaultOfferFooter} onChange={e => setDefaultOfferFooter(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>
          <div>
            <Label className="text-xs">Rechnung – Einleitung</Label>
            <Textarea value={defaultInvoiceIntro} onChange={e => setDefaultInvoiceIntro(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>
          <div>
            <Label className="text-xs">Rechnung – Fußtext</Label>
            <Textarea value={defaultInvoiceFooter} onChange={e => setDefaultInvoiceFooter(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>
          <div>
            <Label className="text-xs">Grußformel</Label>
            <Input value={defaultClosing} onChange={e => setDefaultClosing(e.target.value)} placeholder="Mit freundlichen Grüßen" />
          </div>
        </div>
        <Button size="sm" onClick={() => saveDefaultTexts.mutate()} disabled={saveDefaultTexts.isPending}>
          {saveDefaultTexts.isPending ? 'Wird gespeichert…' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
