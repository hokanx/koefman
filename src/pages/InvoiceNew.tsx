import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import LineItemsEditor from '@/components/shared/LineItemsEditor';
import { toast } from 'sonner';
import { generateDocumentNumber } from '@/lib/documentUtils';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';
import { calculateTotals } from '@/lib/taxConfig';
import type { Customer, LineItem } from '@/types';

const InvoiceNew = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isKleinunternehmer } = useOrgTaxMode();

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [introText, setIntroText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [closingText, setClosingText] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
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

  // Auto-fill from settings (once only)
  const prefilled = useRef(false);
  useEffect(() => {
    if (settings && !prefilled.current) {
      prefilled.current = true;
      const fallbackIntro = 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen erlauben wir uns folgende Rechnung zu stellen:';
      const fallbackFooter = 'Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.';
      const fallbackClosing = 'Mit freundlichen Grüßen';
      const fallbackPayment = 'Zahlbar innerhalb von 14 Tagen ohne Abzug.';
      setIntroText((settings as any).default_invoice_intro_text || fallbackIntro);
      setFooterText((settings as any).default_invoice_footer_text || fallbackFooter);
      setClosingText((settings as any).default_closing_text || fallbackClosing);
      setPaymentTerms(settings.payment_terms || fallbackPayment);
      if (!dueDate) {
        const due = new Date();
        due.setDate(due.getDate() + 14);
        setDueDate(due.toISOString().split('T')[0]);
      }
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const tax_total = items.reduce((s, i) => s + (i.total * i.tax_rate) / 100, 0);
      const grand_total = subtotal + tax_total;

      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user!.id);
      const prefix = settings?.invoice_number_prefix || 'RE-';
      const invoiceNumber = generateDocumentNumber(prefix, count ?? 0);

      const { data: invoice, error } = await supabase.from('invoices').insert({
        user_id: user!.id, customer_id: customerId, invoice_number: invoiceNumber,
        date, due_date: dueDate || date, status: 'open', notes,
        intro_text: introText, footer_text: footerText, closing_text: closingText,
        subtotal, tax_total, grand_total,
      } as any).select().single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
          items.map((item, index) => ({
            invoice_id: invoice!.id, title: item.title, description: item.description,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            tax_rate: item.tax_rate, total: item.total, sort_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-counts'] });
      toast.success(t.common.success);
      navigate('/invoices');
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
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.invoices.newInvoice}</h2>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <FormSection title={t.invoices.invoiceDetails}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.invoices.customer} *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className={inputClass}>
              <option value="">{t.invoices.selectCustomer}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.invoices.date}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.invoices.dueDate}</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>
        </FormSection>

        <FormSection title={t.invoices.documentTexts}>
          <p className="text-[11px] text-muted-foreground/60 -mt-1 mb-3 flex items-center gap-1">
            <span>📝</span> Änderungen gelten nur für dieses Dokument
          </p>
          <div>
            <label className="mb-0.5 block text-sm text-muted-foreground">{t.invoices.introText}</label>
            <p className="text-[11px] text-muted-foreground/50 mb-1">Standardtext aus Einstellungen (bearbeitbar)</p>
            <textarea value={introText} onChange={(e) => setIntroText(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.invoices.notes}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.invoices.paymentTerms}</label>
            <textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-0.5 block text-sm text-muted-foreground">{t.invoices.footerText}</label>
            <p className="text-[11px] text-muted-foreground/50 mb-1">Standardtext aus Einstellungen (bearbeitbar)</p>
            <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-0.5 block text-sm text-muted-foreground">{t.invoices.closingText}</label>
            <p className="text-[11px] text-muted-foreground/50 mb-1">Standardtext aus Einstellungen (bearbeitbar)</p>
            <input type="text" value={closingText} onChange={(e) => setClosingText(e.target.value)} className={inputClass} />
          </div>
          {isKleinunternehmer && (
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-start gap-2">
              <span className="text-[11px] mt-px">⚖️</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Steuerhinweis wird automatisch ergänzt: <span className="italic">„Gemäß §19 UStG wird keine Umsatzsteuer berechnet."</span></p>
            </div>
          )}
        </FormSection>

        <FormSection title={t.invoices.items}>
          <LineItemsEditor items={items} onChange={setItems} showTemplatePicker
            defaultTaxRate={settings?.default_tax_rate ?? 19}
            defaultUnit="Pauschal"
            labels={{
            addItem: t.invoices.addItem, itemTitle: t.invoices.itemTitle, description: t.invoices.description,
            quantity: t.invoices.quantity, unit: t.invoices.unit, unitPrice: t.invoices.unitPrice,
            taxRate: t.invoices.taxRate, total: t.invoices.total,
          }} />
        </FormSection>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent md:flex-none md:px-6">
            {t.common.cancel}
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:flex-none md:px-6">
            {mutation.isPending ? t.common.loading : t.common.save}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceNew;
