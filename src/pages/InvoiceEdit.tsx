import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import LineItemsEditor from '@/components/shared/LineItemsEditor';
import { toast } from 'sonner';
import type { Customer, LineItem, InvoiceStatus } from '@/types';

const InvoiceEdit = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('open');
  const [notes, setNotes] = useState('');
  const [introText, setIntroText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [closingText, setClosingText] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);

  const { data: invoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*').eq('id', id!).eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: invoiceItems } = useQuery({
    queryKey: ['invoice-items', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id!).order('sort_order');
      return data || [];
    },
    enabled: !!id,
  });

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

  const prefilled = useRef(false);
  useEffect(() => {
    if (invoice && !prefilled.current) {
      prefilled.current = true;
      const fallbackIntro = 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen erlauben wir uns, wie folgt abzurechnen:';
      const fallbackFooter = 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.';
      const fallbackClosing = 'Mit freundlichen Grüßen';
      setCustomerId(invoice.customer_id);
      setDate(invoice.date);
      setDueDate(invoice.due_date);
      setStatus(invoice.status as InvoiceStatus);
      setNotes(invoice.notes || '');
      setIntroText((invoice as any).intro_text || (settings as any)?.default_invoice_intro_text || fallbackIntro);
      setFooterText((invoice as any).footer_text || (settings as any)?.default_invoice_footer_text || fallbackFooter);
      setClosingText((invoice as any).closing_text || (settings as any)?.default_closing_text || fallbackClosing);
    }
  }, [invoice, settings]);

  useEffect(() => {
    if (invoiceItems) {
      setItems(invoiceItems.map((i: any) => ({
        id: i.id, title: i.title, description: i.description || '', quantity: i.quantity,
        unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate,
        total: i.quantity * i.unit_price, sort_order: i.sort_order,
      })));
    }
  }, [invoiceItems]);

  const mutation = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const tax_total = items.reduce((s, i) => s + (i.total * i.tax_rate) / 100, 0);
      const grand_total = subtotal + tax_total;

      const { error } = await supabase.from('invoices').update({
        customer_id: customerId, date, due_date: dueDate, status, notes,
        intro_text: introText, footer_text: footerText, closing_text: closingText,
        subtotal, tax_total, grand_total,
      } as any).eq('id', id!);
      if (error) throw error;

      await supabase.from('invoice_items').delete().eq('invoice_id', id!);
      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
          items.map((item, index) => ({
            invoice_id: id!, title: item.title, description: item.description,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            tax_rate: item.tax_rate, total: item.total, sort_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t.common.updated);
      navigate(`/invoices/${id}`);
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
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.invoices.editInvoice}</h2>
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
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.invoices.status}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} className={inputClass}>
              <option value="open">{t.invoices.open}</option>
              <option value="paid">{t.invoices.paid}</option>
              <option value="overdue">{t.invoices.overdue}</option>
              <option value="cancelled">{t.invoices.cancelled}</option>
            </select>
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
            <label className="mb-0.5 block text-sm text-muted-foreground">{t.invoices.footerText}</label>
            <p className="text-[11px] text-muted-foreground/50 mb-1">Standardtext aus Einstellungen (bearbeitbar)</p>
            <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="mb-0.5 block text-sm text-muted-foreground">{t.invoices.closingText}</label>
            <p className="text-[11px] text-muted-foreground/50 mb-1">Standardtext aus Einstellungen (bearbeitbar)</p>
            <input type="text" value={closingText} onChange={(e) => setClosingText(e.target.value)} className={inputClass} />
          </div>
        </FormSection>

        <FormSection title={t.invoices.items}>
          <LineItemsEditor items={items} onChange={setItems} showTemplatePicker
            defaultTaxRate={19}
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
            {mutation.isPending ? t.common.loading : t.common.update}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceEdit;
