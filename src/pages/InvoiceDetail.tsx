import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Download, Edit, XCircle, RotateCcw, CopyPlus, Bell, Clock, Mail } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { generateDocumentNumber } from '@/lib/documentUtils';
import { generatePdf, formatDateDE, generateReminderPdf } from '@/lib/generatePdf';
import { formatAddress } from '@/types';
import type { InvoiceStatus } from '@/types';
import EmailModal from '@/components/shared/EmailModal';

const InvoiceDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailType, setEmailType] = useState<'invoice' | 'reminder'>('invoice');

  const statusLabels = t.status as Record<string, string>;

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('*, customer:customers(*)').eq('id', id!).eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['invoice-items', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id!).order('sort_order');
      return data || [];
    },
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['invoice-reminders', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoice_reminders').select('*').eq('invoice_id', id!).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id && !!user,
  });

  const { data: sentEmails = [] } = useQuery({
    queryKey: ['document-emails', 'invoice', id],
    queryFn: async () => {
      const { data } = await supabase.from('document_emails').select('*').eq('document_id', id!).eq('document_type', 'invoice').order('sent_at', { ascending: false });
      return data || [];
    },
    enabled: !!id && !!user,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-counts'] });
      toast.success(t.invoices.statusUpdated);
    },
  });

  // Auto-detect overdue
  const currentStatus = invoice?.status as InvoiceStatus;
  const isOverdue = currentStatus === 'open' && invoice?.due_date && new Date(invoice.due_date) < new Date();

  const handleDuplicate = async () => {
    if (!invoice || !user) return;
    setDuplicating(true);
    try {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const prefix = settings?.invoice_number_prefix || 'RE-';
      const invoiceNumber = generateDocumentNumber(prefix, count ?? 0);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: newInvoice, error } = await supabase.from('invoices').insert({
        user_id: user.id, customer_id: invoice.customer_id, invoice_number: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'open', notes: invoice.notes,
        intro_text: (invoice as any).intro_text, footer_text: (invoice as any).footer_text,
        closing_text: (invoice as any).closing_text,
        subtotal: invoice.subtotal, tax_total: invoice.tax_total, grand_total: invoice.grand_total,
      } as any).select().single();
      if (error) throw error;

      if (items.length > 0) {
        await supabase.from('invoice_items').insert(
          items.map((item: any, index: number) => ({
            invoice_id: newInvoice!.id, title: item.title, description: item.description,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            tax_rate: item.tax_rate, total: item.total, sort_order: index,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t.common.success);
      navigate(`/invoices/${newInvoice!.id}`);
    } catch {
      toast.error(t.common.error);
    } finally {
      setDuplicating(false);
    }
  };

  const handlePdfExport = async () => {
    if (!invoice) return;
    setGenerating(true);
    try {
      const customer = (invoice as any).customer;
      const businessAddress = settings ? formatAddress(settings as any) : '';
      const customerAddress = customer ? formatAddress(customer) : '';

      const isSmallBiz = !!(settings as any)?.small_business_regulation;
      await generatePdf({
        type: 'invoice',
        small_business_regulation: isSmallBiz,
        documentTitle: t.invoices.documentTitle,
        documentNumber: invoice.invoice_number,
        date: formatDateDE(invoice.date),
        dueDate: formatDateDE(invoice.due_date),
        business: {
          business_name: settings?.business_name || '',
          address: businessAddress || undefined,
          email: settings?.email || undefined,
          phone: settings?.phone || undefined,
          tax_number: settings?.tax_number || undefined,
          vat_id: settings?.vat_id || undefined,
          logo_url: settings?.logo_url || undefined,
          payment_terms: settings?.payment_terms || undefined,
          account_holder: (settings as any)?.account_holder || undefined,
          bank_name: (settings as any)?.bank_name || undefined,
          iban: (settings as any)?.iban || undefined,
          bic: (settings as any)?.bic || undefined,
          owner_name: (settings as any)?.owner_name || undefined,
        },
        customer: {
          name: customer?.name || '',
          address: customerAddress || undefined,
        },
        items: items.map((i: any) => ({
          title: i.title, description: i.description, quantity: i.quantity,
          unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total,
        })),
        subtotal: invoice.subtotal, tax_total: invoice.tax_total, grand_total: invoice.grand_total,
        intro_text: (invoice as any).intro_text || undefined,
        footer_text: (invoice as any).footer_text || undefined,
        closing_text: (invoice as any).closing_text || undefined,
        notes: invoice.notes || undefined,
        labels: {
          date: t.invoices.date, dueDate: t.invoices.dueDate, quantity: t.invoices.quantity,
          unit: t.invoices.unit, unitPrice: t.invoices.unitPrice, taxRate: t.invoices.taxRate,
          total: t.invoices.total, subtotal: t.invoices.subtotal, taxTotal: t.invoices.taxTotal,
          grandTotal: t.invoices.grandTotal, description: t.invoices.description,
          itemTitle: t.invoices.itemTitle, page: 'Seite',
        },
      });
    } finally {
      setGenerating(false);
    }
  };
  const handleCreateReminder = async () => {
    if (!invoice || !user || !settings) return;
    setCreatingReminder(true);
    try {
      const customer = (invoice as any).customer;
      const businessAddress = settings ? formatAddress(settings as any) : '';
      const customerAddress = customer ? formatAddress(customer) : '';
      const nextLevel = reminders.length + 1;

      // Save reminder record
      await supabase.from('invoice_reminders').insert({
        invoice_id: id!,
        user_id: user.id,
        reminder_type: 'zahlungserinnerung',
        reminder_level: nextLevel,
      } as any);

      // Generate PDF
      await generateReminderPdf({
        business: {
          business_name: settings?.business_name || '',
          address: businessAddress || undefined,
          email: settings?.email || undefined,
          phone: settings?.phone || undefined,
          tax_number: settings?.tax_number || undefined,
          vat_id: settings?.vat_id || undefined,
          logo_url: settings?.logo_url || undefined,
          payment_terms: settings?.payment_terms || undefined,
          account_holder: (settings as any)?.account_holder || undefined,
          bank_name: (settings as any)?.bank_name || undefined,
          iban: (settings as any)?.iban || undefined,
          bic: (settings as any)?.bic || undefined,
          owner_name: (settings as any)?.owner_name || undefined,
        },
        customer: {
          name: customer?.name || '',
          address: customerAddress || undefined,
        },
        invoiceNumber: invoice.invoice_number,
        invoiceDate: formatDateDE(invoice.date),
        dueDate: formatDateDE(invoice.due_date),
        grandTotal: invoice.grand_total,
        reminderDate: formatDateDE(new Date()),
        reminderLevel: nextLevel,
        labels: { page: 'Seite' },
      });

      queryClient.invalidateQueries({ queryKey: ['invoice-reminders', id] });
      toast.success(t.invoices.reminderCreated);
    } catch {
      toast.error(t.common.error);
    } finally {
      setCreatingReminder(false);
    }
  };

  const getInvoicePdfBase64 = async (): Promise<string> => {
    const customer = (invoice as any)?.customer;
    const businessAddress = settings ? formatAddress(settings as any) : '';
    const customerAddress = customer ? formatAddress(customer) : '';
    const isSmallBiz = !!(settings as any)?.small_business_regulation;
    const result = await generatePdf({
      type: 'invoice',
      small_business_regulation: isSmallBiz,
      documentTitle: t.invoices.documentTitle,
      documentNumber: invoice!.invoice_number,
      date: formatDateDE(invoice!.date),
      dueDate: formatDateDE(invoice!.due_date),
      business: {
        business_name: settings?.business_name || '',
        address: businessAddress || undefined,
        email: settings?.email || undefined,
        phone: settings?.phone || undefined,
        tax_number: settings?.tax_number || undefined,
        vat_id: settings?.vat_id || undefined,
        logo_url: settings?.logo_url || undefined,
        payment_terms: settings?.payment_terms || undefined,
        account_holder: (settings as any)?.account_holder || undefined,
        bank_name: (settings as any)?.bank_name || undefined,
        iban: (settings as any)?.iban || undefined,
        bic: (settings as any)?.bic || undefined,
        owner_name: (settings as any)?.owner_name || undefined,
      },
      customer: { name: customer?.name || '', address: customerAddress || undefined },
      items: items.map((i: any) => ({
        title: i.title, description: i.description, quantity: i.quantity,
        unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total,
      })),
      subtotal: invoice!.subtotal, tax_total: invoice!.tax_total, grand_total: invoice!.grand_total,
      intro_text: (invoice as any).intro_text || undefined,
      footer_text: (invoice as any).footer_text || undefined,
      closing_text: (invoice as any).closing_text || undefined,
      notes: invoice!.notes || undefined,
      labels: {
        date: t.invoices.date, dueDate: t.invoices.dueDate, quantity: t.invoices.quantity,
        unit: t.invoices.unit, unitPrice: t.invoices.unitPrice, taxRate: t.invoices.taxRate,
        total: t.invoices.total, subtotal: t.invoices.subtotal, taxTotal: t.invoices.taxTotal,
        grandTotal: t.invoices.grandTotal, description: t.invoices.description,
        itemTitle: t.invoices.itemTitle, page: 'Seite',
      },
    }, true);
    return result as string;
  };

  const getReminderPdfBase64 = async (): Promise<string> => {
    const customer = (invoice as any)?.customer;
    const businessAddress = settings ? formatAddress(settings as any) : '';
    const customerAddress = customer ? formatAddress(customer) : '';
    const result = await generateReminderPdf({
      business: {
        business_name: settings?.business_name || '',
        address: businessAddress || undefined,
        email: settings?.email || undefined,
        phone: settings?.phone || undefined,
        tax_number: settings?.tax_number || undefined,
        vat_id: settings?.vat_id || undefined,
        logo_url: settings?.logo_url || undefined,
        payment_terms: settings?.payment_terms || undefined,
        account_holder: (settings as any)?.account_holder || undefined,
        bank_name: (settings as any)?.bank_name || undefined,
        iban: (settings as any)?.iban || undefined,
        bic: (settings as any)?.bic || undefined,
        owner_name: (settings as any)?.owner_name || undefined,
      },
      customer: { name: customer?.name || '', address: customerAddress || undefined },
      invoiceNumber: invoice!.invoice_number,
      invoiceDate: formatDateDE(invoice!.date),
      dueDate: formatDateDE(invoice!.due_date),
      grandTotal: invoice!.grand_total,
      reminderDate: formatDateDE(new Date()),
      reminderLevel: reminders.length + 1,
      labels: { page: 'Seite' },
    }, true);
    return result as string;
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  if (!invoice) {
    return <div className="p-6 text-center text-muted-foreground">{t.common.noResults}</div>;
  }

  const displayStatus = isOverdue ? 'overdue' : currentStatus;

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate('/invoices')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{invoice.invoice_number}</h2>
              <p className="text-sm text-muted-foreground">{(invoice as any).customer?.name}</p>
            </div>
            <StatusBadge status={displayStatus as any} label={statusLabels[displayStatus as InvoiceStatus]} />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t.invoices.date}: {formatDateDE(invoice.date)}</p>
            <p className={isOverdue ? 'text-destructive font-medium' : ''}>
              {t.invoices.dueDate}: {formatDateDE(invoice.due_date)}
            </p>
            {settings?.payment_terms && (
              <p>{t.invoices.paymentTerms}: {settings.payment_terms}</p>
            )}
          </div>

          {/* Overdue warning */}
          {isOverdue && (
            <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
              <p className="font-medium text-destructive">{t.invoices.overdueWarning}</p>
            </div>
          )}

          {invoice.notes && <p className="mt-2 text-sm text-foreground">{invoice.notes}</p>}
          {invoice.source_offer_id && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t.invoices.fromOffer}: <Link to={`/offers/${invoice.source_offer_id}`} className="font-medium text-primary hover:underline">{invoice.source_offer_id.slice(0, 8)}…</Link>
            </p>
          )}

          {/* Status change actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">{t.invoices.changeStatus}:</span>
            {(currentStatus === 'open' || currentStatus === 'draft' || isOverdue) && (
              <button onClick={() => statusMutation.mutate('paid')} disabled={statusMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> {t.invoices.markAsPaid}
              </button>
            )}
            {currentStatus === 'draft' && (
              <button onClick={() => statusMutation.mutate('open')} disabled={statusMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-info px-3 py-2 text-sm font-semibold text-info-foreground hover:bg-info/90 disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> {t.invoices.markAsOpen}
              </button>
            )}
            {(currentStatus === 'open' || currentStatus === 'draft') && (
              <button onClick={() => statusMutation.mutate('cancelled')} disabled={statusMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> {t.invoices.markAsCancelled}
              </button>
            )}
            {currentStatus === 'cancelled' && (
              <button onClick={() => statusMutation.mutate('draft')} disabled={statusMutation.isPending}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> {t.invoices.draft}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/invoices/${id}/edit`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <Edit className="h-4 w-4" /> {t.invoices.editInvoice}
            </Link>
            <button onClick={handlePdfExport} disabled={generating}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
              <Download className="h-4 w-4" /> {generating ? t.common.generating : t.common.downloadPdf}
            </button>
            <button onClick={handleDuplicate} disabled={duplicating}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
              <CopyPlus className="h-4 w-4" /> {duplicating ? t.common.loading : t.invoices.duplicateInvoice}
            </button>
            {(currentStatus === 'open' || currentStatus === 'draft' || isOverdue) && (
              <button onClick={handleCreateReminder} disabled={creatingReminder}
                className="flex items-center gap-2 rounded-lg bg-warning px-3 py-2 text-sm font-semibold text-warning-foreground hover:bg-warning/90 disabled:opacity-50">
                <Bell className="h-4 w-4" /> {creatingReminder ? t.common.generating : t.invoices.createReminder}
              </button>
            )}
            <button onClick={() => { setEmailType('invoice'); setEmailOpen(true); }}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <Mail className="h-4 w-4" /> {t.email.sendByEmail}
            </button>
            {(currentStatus === 'open' || isOverdue) && reminders.length > 0 && (
              <button onClick={() => { setEmailType('reminder'); setEmailOpen(true); }}
                className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm font-medium text-warning hover:bg-warning/20">
                <Mail className="h-4 w-4" /> {t.invoices.reminderDocumentTitle}
              </button>
            )}
          </div>

        {items.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 font-semibold text-foreground">{t.invoices.items}</h3>
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    <p className="text-muted-foreground">{item.quantity} × {t.common.currency}{item.unit_price.toFixed(2)}</p>
                  </div>
                  <p className="font-medium text-foreground">{t.common.currency}{item.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.invoices.subtotal}</span><span>{t.common.currency}{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.invoices.taxTotal}</span><span>{t.common.currency}{invoice.tax_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t.invoices.grandTotal}</span><span>{t.common.currency}{invoice.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Reminder History */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <Clock className="h-4 w-4" /> {t.invoices.reminderHistory}
          </h3>
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.invoices.noReminders}</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-warning" />
                    <span className="text-foreground">
                      {t.invoices.reminderCreatedAt} {formatDateDE(r.created_at)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t.invoices.reminderLevel} {r.reminder_level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
