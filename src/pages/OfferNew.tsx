import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import LineItemsEditor from '@/components/shared/LineItemsEditor';
import { toast } from 'sonner';
import type { Customer, LineItem } from '@/types';

const OfferNew = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [introText, setIntroText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [closingText, setClosingText] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').eq('user_id', user!.id).order('name');
      return (data || []) as Pick<Customer, 'id' | 'name'>[];
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Auto-fill from settings
  useEffect(() => {
    if (settings) {
      setIntroText((settings as any).default_offer_intro_text || '');
      setFooterText((settings as any).default_offer_footer_text || '');
      setClosingText((settings as any).default_closing_text || '');
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const tax_total = items.reduce((s, i) => s + (i.total * i.tax_rate) / 100, 0);
      const grand_total = subtotal + tax_total;

      const { count } = await supabase.from('offers').select('*', { count: 'exact', head: true }).eq('user_id', user!.id);
      const prefix = settings?.offer_number_prefix || 'ANG-';
      const offerNumber = `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`;

      const { data: offer, error } = await supabase.from('offers').insert({
        user_id: user!.id, customer_id: customerId, offer_number: offerNumber,
        date, status: 'draft', notes, internal_notes: internalNotes,
        intro_text: introText, footer_text: footerText, closing_text: closingText,
        subtotal, tax_total, grand_total,
      } as any).select().single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('offer_items').insert(
          items.map((item, index) => ({
            offer_id: offer!.id, title: item.title, description: item.description,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            tax_rate: item.tax_rate, total: item.total, sort_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offer-count'] });
      toast.success(t.common.success);
      navigate('/offers');
    },
    onError: () => toast.error(t.common.error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    mutation.mutate();
  };

  const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.offers.newOffer}</h2>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <FormSection title={t.offers.offerDetails}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.customer} *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className={inputClass}>
              <option value="">{t.offers.selectCustomer}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.date}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        </FormSection>

        <FormSection title={t.offers.documentTexts}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.introText}</label>
            <textarea value={introText} onChange={(e) => setIntroText(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.notes}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.footerText}</label>
            <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.closingText}</label>
            <input type="text" value={closingText} onChange={(e) => setClosingText(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.offers.internalNotes}</label>
            <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
        </FormSection>

        <FormSection title={t.offers.items}>
          <LineItemsEditor items={items} onChange={setItems} showTemplatePicker labels={{
            addItem: t.offers.addItem, itemTitle: t.offers.itemTitle, description: t.offers.description,
            quantity: t.offers.quantity, unit: t.offers.unit, unitPrice: t.offers.unitPrice,
            taxRate: t.offers.taxRate, total: t.offers.total,
          }} />
        </FormSection>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent md:flex-none md:px-6">
            {t.common.cancel}
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:flex-none md:px-6">
            {mutation.isPending ? t.common.loading : t.offers.saveDraft}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OfferNew;
