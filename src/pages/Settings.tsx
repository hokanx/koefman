import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { toast } from 'sonner';

const Settings = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    business_name: '',
    address: '',
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
  });

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
      setForm({
        business_name: settings.business_name || '',
        address: settings.address || '',
        email: settings.email || '',
        phone: settings.phone || '',
        tax_number: settings.tax_number || '',
        vat_id: settings.vat_id || '',
        currency: settings.currency || 'EUR',
        default_tax_rate: settings.default_tax_rate ?? 19,
        payment_terms: settings.payment_terms || '',
        offer_number_prefix: settings.offer_number_prefix || 'ANG-',
        invoice_number_prefix: settings.invoice_number_prefix || 'RE-',
        business_category: settings.business_category || 'general',
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (settings) {
        const { error } = await supabase
          .from('business_settings')
          .update(form)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_settings')
          .insert({ ...form, user_id: user!.id });
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

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.settings.title}</h2>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <FormSection title={t.settings.businessProfile}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.businessName}</label>
            <input type="text" value={form.business_name} onChange={(e) => update('business_name', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.address}</label>
            <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.email}</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.phone}</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.taxNumber}</label>
              <input type="text" value={form.tax_number} onChange={(e) => update('tax_number', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.vatId}</label>
              <input type="text" value={form.vat_id} onChange={(e) => update('vat_id', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.businessCategory}</label>
            <select value={form.business_category} onChange={(e) => update('business_category', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none">
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
              <input type="text" value={form.offer_number_prefix} onChange={(e) => update('offer_number_prefix', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.invoiceNumberFormat}</label>
              <input type="text" value={form.invoice_number_prefix} onChange={(e) => update('invoice_number_prefix', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.currency}</label>
              <select value={form.currency} onChange={(e) => update('currency', e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.settings.defaultTaxRate}</label>
              <input type="number" value={form.default_tax_rate} onChange={(e) => update('default_tax_rate', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.settings.paymentTerms}</label>
            <textarea value={form.payment_terms} onChange={(e) => update('payment_terms', e.target.value)} rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none resize-none" />
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
