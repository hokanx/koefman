import { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { toast } from 'sonner';

const DEFAULT_TEXTS = {
  de: {
    offer_intro: 'Sehr geehrte Damen und Herren,\n\nwir bieten Ihnen die nachfolgend aufgeführten Leistungen zu den genannten Konditionen an:',
    offer_footer: 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.\n\nDieses Angebot ist 14 Tage gültig.',
    invoice_intro: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen erlauben wir uns, wie folgt abzurechnen:',
    invoice_footer: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    payment_terms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    closing: 'Mit freundlichen Grüßen',
  },
  en: {
    offer_intro: 'Dear Sir or Madam,\n\nwe are pleased to offer you the following services under the stated conditions:',
    offer_footer: 'This offer is valid for 14 days.',
    invoice_intro: 'Dear Sir or Madam,\n\nplease find below our invoice for the services rendered:',
    invoice_footer: 'Please transfer the invoice amount stating the invoice number to the account below.',
    payment_terms: 'Payable within 14 days without deduction.',
    closing: 'Kind regards',
  },
  ar: {
    offer_intro: 'السادة الكرام،\n\nيسعدنا أن نقدم لكم العرض التالي بالشروط المذكورة:',
    offer_footer: 'هذا العرض صالح لمدة 14 يوماً.',
    invoice_intro: 'السادة الكرام،\n\nنرفق لكم فاتورتنا عن الخدمات المقدمة:',
    invoice_footer: 'يرجى تحويل المبلغ مع ذكر رقم الفاتورة إلى الحساب المذكور أدناه.',
    payment_terms: 'مستحق الدفع خلال 14 يوماً بدون خصم.',
    closing: 'مع أطيب التحيات',
  },
};

const Settings = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    business_name: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    country: 'Deutschland',
    email: '',
    phone: '',
    tax_number: '',
    vat_id: '',
    currency: 'EUR',
    default_tax_rate: 19,
    payment_terms: '',
    offer_number_prefix: 'ANG-',
    invoice_number_prefix: 'RE-',
    business_category: 'general',
    default_offer_intro_text: '',
    default_offer_footer_text: '',
    default_invoice_intro_text: '',
    default_invoice_footer_text: '',
    default_closing_text: '',
    owner_name: '',
    default_offer_title: '',
    account_holder: '',
    bank_name: '',
    iban: '',
    bic: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isNewSettings, setIsNewSettings] = useState(true);

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setIsNewSettings(false);
      const defaults = DEFAULT_TEXTS[language as keyof typeof DEFAULT_TEXTS] || DEFAULT_TEXTS.de;
      setForm({
        business_name: settings.business_name || '',
        street: (settings as any).street || '',
        house_number: (settings as any).house_number || '',
        postal_code: (settings as any).postal_code || '',
        city: (settings as any).city || '',
        country: (settings as any).country || 'Deutschland',
        email: settings.email || '',
        phone: settings.phone || '',
        tax_number: settings.tax_number || '',
        vat_id: settings.vat_id || '',
        currency: settings.currency || 'EUR',
        default_tax_rate: settings.default_tax_rate ?? 19,
        payment_terms: settings.payment_terms || defaults.payment_terms,
        offer_number_prefix: settings.offer_number_prefix || 'ANG-',
        invoice_number_prefix: settings.invoice_number_prefix || 'RE-',
        business_category: settings.business_category || 'general',
        default_offer_intro_text: (settings as any).default_offer_intro_text || defaults.offer_intro,
        default_offer_footer_text: (settings as any).default_offer_footer_text || defaults.offer_footer,
        default_invoice_intro_text: (settings as any).default_invoice_intro_text || defaults.invoice_intro,
        default_invoice_footer_text: (settings as any).default_invoice_footer_text || defaults.invoice_footer,
        default_closing_text: (settings as any).default_closing_text || defaults.closing,
        owner_name: (settings as any).owner_name || '',
        default_offer_title: (settings as any).default_offer_title || '',
        account_holder: (settings as any).account_holder || '',
        bank_name: (settings as any).bank_name || '',
        iban: (settings as any).iban || '',
        bic: (settings as any).bic || '',
      });
      setLogoUrl(settings.logo_url || null);
    } else {
      // Prefill defaults for new settings
      const defaults = DEFAULT_TEXTS[language as keyof typeof DEFAULT_TEXTS] || DEFAULT_TEXTS.de;
      setForm((prev) => ({
        ...prev,
        payment_terms: defaults.payment_terms,
        default_offer_intro_text: defaults.offer_intro,
        default_offer_footer_text: defaults.offer_footer,
        default_invoice_intro_text: defaults.invoice_intro,
        default_invoice_footer_text: defaults.invoice_footer,
        default_closing_text: defaults.closing,
      }));
    }
  }, [settings, language]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path);
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setLogoUrl(newUrl);
      if (settings) {
        await supabase.from('business_settings').update({ logo_url: newUrl }).eq('id', settings.id);
      } else {
        await supabase.from('business_settings').insert({ user_id: user.id, logo_url: newUrl });
      }
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success(t.common.logoUploaded);
    } catch {
      toast.error(t.common.logoError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    if (!user) return;
    try {
      const { data: files } = await supabase.storage.from('business-logos').list(user.id);
      if (files && files.length > 0) {
        await supabase.storage.from('business-logos').remove(files.map((f) => `${user.id}/${f.name}`));
      }
      if (settings) {
        await supabase.from('business_settings').update({ logo_url: null }).eq('id', settings.id);
      }
      setLogoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success(t.common.logoRemoved);
    } catch {
      toast.error(t.common.error);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Build address field from structured fields for backward compat
      const address = [
        [form.street, form.house_number].filter(Boolean).join(' '),
        [form.postal_code, form.city].filter(Boolean).join(' '),
        form.country,
      ].filter(Boolean).join('\n');

      const payload = { ...form, address };

      if (settings) {
        const { error } = await supabase
          .from('business_settings')
          .update(payload as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_settings')
          .insert({ ...payload, user_id: user!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success(t.settings.saved);
    },
    onError: () => toast.error(t.common.error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none";
  const textareaClass = `${inputClass} resize-none`;

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.settings.title}</h2>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {/* Logo Section */}
        <FormSection title={t.settings.logoSection}>
          <p className="text-sm text-muted-foreground mb-3">{t.settings.logoDescription}</p>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative">
                <img src={logoUrl} alt="Logo" className="h-16 w-auto max-w-[120px] rounded-lg border border-border object-contain bg-white p-1" />
                <button type="button" onClick={handleLogoRemove}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                <Upload className="h-4 w-4" />
                {uploading ? t.common.logoUploading : logoUrl ? t.settings.replaceLogo : t.settings.uploadLogo}
              </button>
            </div>
          </div>
        </FormSection>

        <FormSection title={t.settings.businessProfile}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.businessName}</label>
            <input type="text" value={form.business_name} onChange={(e) => update('business_name', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.street}</label>
              <input type="text" value={form.street} onChange={(e) => update('street', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.houseNumber}</label>
              <input type="text" value={form.house_number} onChange={(e) => update('house_number', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.postalCode}</label>
              <input type="text" value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.city}</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.country}</label>
            <input type="text" value={form.country} onChange={(e) => update('country', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.email}</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.phone}</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.taxNumber}</label>
              <input type="text" value={form.tax_number} onChange={(e) => update('tax_number', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.vatId}</label>
              <input type="text" value={form.vat_id} onChange={(e) => update('vat_id', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.businessCategory}</label>
            <select value={form.business_category} onChange={(e) => update('business_category', e.target.value)} className={inputClass}>
              <option value="general">{t.settings.general}</option>
              <option value="garage">{t.settings.garage}</option>
              <option value="cleaning">{t.settings.cleaning}</option>
            </select>
          </div>
        </FormSection>

        <FormSection title={t.settings.documentSettings}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.offerNumberFormat}</label>
              <input type="text" value={form.offer_number_prefix} onChange={(e) => update('offer_number_prefix', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.invoiceNumberFormat}</label>
              <input type="text" value={form.invoice_number_prefix} onChange={(e) => update('invoice_number_prefix', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.currency}</label>
              <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className={inputClass}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultTaxRate}</label>
              <input type="number" value={form.default_tax_rate} onChange={(e) => update('default_tax_rate', parseFloat(e.target.value) || 0)} className={inputClass} />
            </div>
          </div>
        </FormSection>

        <FormSection title={t.settings.defaultTexts}>
          <p className="text-sm text-muted-foreground mb-3">{t.settings.defaultTextsDescription}</p>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultOfferIntro}</label>
            <textarea value={form.default_offer_intro_text} onChange={(e) => update('default_offer_intro_text', e.target.value)} rows={2} className={textareaClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultOfferFooter}</label>
            <textarea value={form.default_offer_footer_text} onChange={(e) => update('default_offer_footer_text', e.target.value)} rows={2} className={textareaClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultInvoiceIntro}</label>
            <textarea value={form.default_invoice_intro_text} onChange={(e) => update('default_invoice_intro_text', e.target.value)} rows={2} className={textareaClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultInvoiceFooter}</label>
            <textarea value={form.default_invoice_footer_text} onChange={(e) => update('default_invoice_footer_text', e.target.value)} rows={2} className={textareaClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.paymentTerms}</label>
            <textarea value={form.payment_terms} onChange={(e) => update('payment_terms', e.target.value)} rows={2} className={textareaClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultClosingText}</label>
            <input type="text" value={form.default_closing_text} onChange={(e) => update('default_closing_text', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.ownerName}</label>
            <p className="text-xs text-muted-foreground mb-1">{t.settings.ownerNameDescription}</p>
            <input type="text" value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultOfferTitle}</label>
            <p className="text-xs text-muted-foreground mb-1">{t.settings.defaultOfferTitleDescription}</p>
            <input type="text" value={form.default_offer_title} onChange={(e) => update('default_offer_title', e.target.value)} className={inputClass} placeholder="z.B. Angebot für Reinigungsdienstleistungen" />
          </div>
        </FormSection>

        <FormSection title={t.settings.bankDetails}>
          <p className="text-sm text-muted-foreground mb-3">{t.settings.bankDetailsDescription}</p>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.accountHolder}</label>
            <input type="text" value={form.account_holder} onChange={(e) => update('account_holder', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.bankName}</label>
            <input type="text" value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.iban}</label>
            <input type="text" value={form.iban} onChange={(e) => update('iban', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.bic}</label>
            <input type="text" value={form.bic} onChange={(e) => update('bic', e.target.value)} className={inputClass} />
          </div>
        </FormSection>

        <FormSection title={t.settings.languageSettings}>
          <LanguageSwitcher />
        </FormSection>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:w-auto md:px-8"
        >
          {mutation.isPending ? t.common.loading : t.settings.saveSettings}
        </button>
      </form>
    </div>
  );
};

export default Settings;
