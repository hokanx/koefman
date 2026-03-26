import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Edit, Send, Check, X, Copy, Link as LinkIcon, ClipboardCheck, CopyPlus, Mail, ScrollText } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { generateDocumentNumber } from '@/lib/documentUtils';
import { generatePdf, formatDateDE } from '@/lib/generatePdf';
import { formatAddress } from '@/types';
import type { OfferStatus } from '@/types';
import { formatEUR } from '@/lib/utils';
import EmailModal from '@/components/shared/EmailModal';
import ContractSetupModal from '@/components/shared/ContractSetupModal';

const OfferDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [generatingConfirmation, setGeneratingConfirmation] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const statusLabels = t.status as Record<string, string>;

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers').select('*, customer:customers(*)').eq('id', id!).eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['offer-items', id],
    queryFn: async () => {
      const { data } = await supabase.from('offer_items').select('*').eq('offer_id', id!).order('sort_order');
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

  const { data: linkedInvoices = [] } = useQuery({
    queryKey: ['linked-invoices', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('id, invoice_number').eq('source_offer_id', id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: sentEmails = [] } = useQuery({
    queryKey: ['document-emails', 'offer', id],
    queryFn: async () => {
      const { data } = await supabase.from('document_emails').select('*').eq('document_id', id!).eq('document_type', 'offer').order('sent_at', { ascending: false });
      return data || [];
    },
    enabled: !!id && !!user,
  });

  const { data: acceptance } = useQuery({
    queryKey: ['offer-acceptance', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offer_acceptances')
        .select('*')
        .eq('offer_id', id!)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: OfferStatus) => {
      const { error } = await supabase.from('offers').update({ status: newStatus }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', id] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success(t.offers.statusUpdated);
    },
  });

  const getPublicLink = () => {
    if (!offer) return '';
    const token = (offer as any).public_token;
    return `${window.location.origin}/offer/view/${token}`;
  };

  const copyLink = async () => {
    const link = getPublicLink();
    await navigator.clipboard.writeText(link);
    toast.success(t.offers.linkCopied);
  };

  const getValidityDate = (): string | null => {
    if (!offer) return null;
    const days = (offer as any).validity_days || 14;
    const offerDate = new Date(offer.date);
    offerDate.setDate(offerDate.getDate() + days);
    return formatDateDE(offerDate);
  };

  const handlePdfExport = async () => {
    if (!offer) return;
    setGenerating(true);
    try {
      const customer = (offer as any).customer;
      const businessAddress = settings ? formatAddress(settings as any) : '';
      const customerAddress = customer ? formatAddress(customer) : '';
      const customTitle = (settings as any)?.default_offer_title || t.offers.documentTitle;
      const validityDays = (offer as any).validity_days || 14;
      const validityDate = getValidityDate();

      const isSmallBiz = !!(settings as any)?.small_business_regulation;

      await generatePdf({
        type: 'offer',
        documentTitle: customTitle,
        documentNumber: offer.offer_number,
        date: formatDateDE(offer.date),
        validityDate: validityDate || undefined,
        validity_days: validityDays,
        small_business_regulation: isSmallBiz,
        legal_note: isSmallBiz ? 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.' : undefined,
        business: {
          business_name: settings?.business_name || '',
          address: businessAddress || undefined,
          email: settings?.email || undefined,
          phone: settings?.phone || undefined,
          tax_number: settings?.tax_number || undefined,
          vat_id: settings?.vat_id || undefined,
          logo_url: settings?.logo_url || undefined,
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
        subtotal: offer.subtotal, tax_total: offer.tax_total, grand_total: offer.grand_total,
        intro_text: (offer as any).intro_text || undefined,
        footer_text: (offer as any).footer_text || undefined,
        closing_text: (offer as any).closing_text || undefined,
        notes: offer.notes || undefined,
        labels: {
          date: t.offers.date, quantity: t.offers.quantity, unit: t.offers.unit,
          unitPrice: t.offers.unitPrice, taxRate: t.offers.taxRate, total: t.offers.total,
          subtotal: t.offers.subtotal, taxTotal: t.offers.taxTotal, grandTotal: t.offers.grandTotal,
          description: t.offers.description, itemTitle: t.offers.itemTitle, page: 'Seite',
        },
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmationPdf = async () => {
    if (!offer || !acceptance) return;
    setGeneratingConfirmation(true);
    try {
      const customer = (offer as any).customer;
      const businessAddress = settings ? formatAddress(settings as any) : '';
      const customerAddress = customer ? formatAddress(customer) : '';

      const acceptedAtDate = new Date((acceptance as any).accepted_at);

      await generatePdf({
        type: 'confirmation',
        documentTitle: t.offers.orderConfirmation,
        documentNumber: `AB-${offer.offer_number}`,
        date: formatDateDE(new Date()),
        reference_offer_number: offer.offer_number,
        reference_offer_date: formatDateDE(offer.date),
        accepted_by_name: (acceptance as any).accepted_by_name,
        accepted_at: formatDateDE(acceptedAtDate),
        accepted_at_time: acceptedAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        signature_text: (acceptance as any).signature_text || undefined,
        signature_image: (acceptance as any).signature_image || undefined,
        business: {
          business_name: settings?.business_name || '',
          address: businessAddress || undefined,
          email: settings?.email || undefined,
          phone: settings?.phone || undefined,
          tax_number: settings?.tax_number || undefined,
          vat_id: settings?.vat_id || undefined,
          logo_url: settings?.logo_url || undefined,
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
        subtotal: offer.subtotal, tax_total: offer.tax_total, grand_total: offer.grand_total,
        small_business_regulation: !!(settings as any)?.small_business_regulation,
        closing_text: (offer as any).closing_text || 'Mit freundlichen Grüßen',
        labels: {
          date: t.offers.date, quantity: t.offers.quantity, unit: t.offers.unit,
          unitPrice: t.offers.unitPrice, taxRate: t.offers.taxRate, total: t.offers.total,
          subtotal: t.offers.subtotal, taxTotal: t.offers.taxTotal, grandTotal: t.offers.grandTotal,
          description: t.offers.description, itemTitle: t.offers.itemTitle, page: 'Seite',
        },
      });
    } finally {
      setGeneratingConfirmation(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!offer || !user) return;
    if (linkedInvoices.length > 0) {
      if (!confirm(t.common.convertConfirm)) return;
    }
    setConverting(true);
    try {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const prefix = settings?.invoice_number_prefix || 'RE-';
      const invoiceNumber = generateDocumentNumber(prefix, count ?? 0);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: invoice, error } = await supabase.from('invoices').insert({
        user_id: user.id, customer_id: offer.customer_id, source_offer_id: offer.id,
        invoice_number: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'open', notes: offer.notes,
        intro_text: (settings as any)?.default_invoice_intro_text || '',
        footer_text: (settings as any)?.default_invoice_footer_text || '',
        closing_text: (settings as any)?.default_closing_text || '',
        subtotal: offer.subtotal, tax_total: offer.tax_total, grand_total: offer.grand_total,
      } as any).select().single();
      if (error) throw error;

      if (items.length > 0) {
        await supabase.from('invoice_items').insert(
          items.map((item: any, index: number) => ({
            invoice_id: invoice!.id, title: item.title, description: item.description,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            tax_rate: item.tax_rate, total: item.total, sort_order: index,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['linked-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-counts'] });
      toast.success(t.common.conversionSuccess);
      navigate(`/invoices/${invoice!.id}`);
    } catch {
      toast.error(t.common.error);
    } finally {
      setConverting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!offer || !user) return;
    setDuplicating(true);
    try {
      const { count } = await supabase.from('offers').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const prefix = settings?.offer_number_prefix || 'ANG-';
      const offerNumber = generateDocumentNumber(prefix, count ?? 0);

      const { data: newOffer, error } = await supabase.from('offers').insert({
        user_id: user.id, customer_id: offer.customer_id, offer_number: offerNumber,
        date: new Date().toISOString().split('T')[0], status: 'draft',
        notes: offer.notes, internal_notes: offer.internal_notes,
        intro_text: (offer as any).intro_text, footer_text: (offer as any).footer_text,
        closing_text: (offer as any).closing_text,
        subtotal: offer.subtotal, tax_total: offer.tax_total, grand_total: offer.grand_total,
      } as any).select().single();
      if (error) throw error;

      if (items.length > 0) {
        await supabase.from('offer_items').insert(
          items.map((item: any, index: number) => ({
            offer_id: newOffer!.id, title: item.title, description: item.description,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            tax_rate: item.tax_rate, total: item.total, sort_order: index,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success(t.common.success);
      navigate(`/offers/${newOffer!.id}`);
    } catch {
      toast.error(t.common.error);
    } finally {
      setDuplicating(false);
    }
  };

  const getOfferPdfBase64 = async (): Promise<string> => {
    const customer = (offer as any)?.customer;
    const businessAddress = settings ? formatAddress(settings as any) : '';
    const customerAddress = customer ? formatAddress(customer) : '';
    const customTitle = (settings as any)?.default_offer_title || t.offers.documentTitle;
    const validityDays = (offer as any)?.validity_days || 14;
    const validityDate = getValidityDate();
    const isSmallBiz = !!(settings as any)?.small_business_regulation;
    const result = await generatePdf({
      type: 'offer',
      documentTitle: customTitle,
      documentNumber: offer!.offer_number,
      date: formatDateDE(offer!.date),
      validityDate: validityDate || undefined,
      validity_days: validityDays,
      small_business_regulation: isSmallBiz,
      legal_note: isSmallBiz ? 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.' : undefined,
      business: {
        business_name: settings?.business_name || '',
        address: businessAddress || undefined,
        email: settings?.email || undefined,
        phone: settings?.phone || undefined,
        tax_number: settings?.tax_number || undefined,
        vat_id: settings?.vat_id || undefined,
        logo_url: settings?.logo_url || undefined,
        owner_name: (settings as any)?.owner_name || undefined,
      },
      customer: { name: customer?.name || '', address: customerAddress || undefined },
      items: items.map((i: any) => ({
        title: i.title, description: i.description, quantity: i.quantity,
        unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total,
      })),
      subtotal: offer!.subtotal, tax_total: offer!.tax_total, grand_total: offer!.grand_total,
      intro_text: (offer as any).intro_text || undefined,
      footer_text: (offer as any).footer_text || undefined,
      closing_text: (offer as any).closing_text || undefined,
      notes: offer!.notes || undefined,
      labels: {
        date: t.offers.date, quantity: t.offers.quantity, unit: t.offers.unit,
        unitPrice: t.offers.unitPrice, taxRate: t.offers.taxRate, total: t.offers.total,
        subtotal: t.offers.subtotal, taxTotal: t.offers.taxTotal, grandTotal: t.offers.grandTotal,
        description: t.offers.description, itemTitle: t.offers.itemTitle, page: 'Seite',
      },
    }, true);
    return result as string;
  };

  const statusActions: { status: OfferStatus; label: string; icon: React.ReactNode; className: string }[] = [];
  if (offer) {
    const s = offer.status as OfferStatus;
    if (s === 'draft') statusActions.push({ status: 'sent', label: t.offers.markAsSent, icon: <Send className="h-4 w-4" />, className: 'bg-info text-info-foreground hover:bg-info/90' });
    if (s === 'sent') {
      statusActions.push({ status: 'accepted', label: t.offers.markAsAccepted, icon: <Check className="h-4 w-4" />, className: 'bg-success text-success-foreground hover:bg-success/90' });
      statusActions.push({ status: 'rejected', label: t.offers.markAsRejected, icon: <X className="h-4 w-4" />, className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' });
    }
    if (s === 'rejected') statusActions.push({ status: 'draft', label: t.offers.draft, icon: <Edit className="h-4 w-4" />, className: 'border border-border text-foreground hover:bg-accent' });
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  if (!offer) {
    return <div className="p-6 text-center text-muted-foreground">{t.common.noResults}</div>;
  }

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate('/offers')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{offer.offer_number}</h2>
              <p className="text-sm text-muted-foreground">{(offer as any).customer?.name}</p>
            </div>
            <StatusBadge status={offer.status as any} label={statusLabels[offer.status as OfferStatus]} />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{t.offers.date}: {formatDateDE(offer.date)}</p>
            <p>{t.offers.validUntil}: {getValidityDate()}</p>
          </div>
          {offer.notes && <p className="mt-2 text-sm text-foreground">{offer.notes}</p>}

          {linkedInvoices.length > 0 && (
            <div className="mt-3 rounded-lg bg-success/10 border border-success/20 p-3 text-sm">
              <p className="font-medium text-success">{t.common.alreadyConverted}</p>
              <div className="mt-1 text-muted-foreground">
                {linkedInvoices.map((inv) => (
                  <Link key={inv.id} to={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline mr-2">{inv.invoice_number}</Link>
                ))}
              </div>
            </div>
          )}

          {/* Acceptance details */}
          {acceptance && (
            <div className="mt-3 rounded-lg bg-success/10 border border-success/20 p-3 text-sm">
              <p className="font-medium text-success">{t.offers.acceptedDigitally}</p>
              <div className="mt-1 space-y-0.5 text-muted-foreground">
                <p>{t.offers.acceptedBy}: {(acceptance as any).accepted_by_name}</p>
                <p>{t.offers.acceptedAt}: {formatDateDE((acceptance as any).accepted_at)}</p>
                {(acceptance as any).signature_image && (
                  <img src={(acceptance as any).signature_image} alt="Signature" className="mt-2 h-12 w-auto border border-border rounded bg-white p-1" />
                )}
              </div>
            </div>
          )}

          {/* Rejection details */}
          {offer.status === 'rejected' && !acceptance && (
            <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
              <p className="font-medium text-destructive">{t.offers.rejectedStatus}</p>
              <div className="mt-1 space-y-0.5 text-muted-foreground">
                {(offer as any).rejected_at && (
                  <p>{t.offers.rejectedAt}: {formatDateDE((offer as any).rejected_at)}</p>
                )}
                {(offer as any).rejected_reason && (
                  <p>{t.offers.rejectedReason}: {(offer as any).rejected_reason}</p>
                )}
              </div>
            </div>
          )}

          {/* Status change actions */}
          {statusActions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center mr-1">{t.offers.changeStatus}:</span>
              {statusActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => statusMutation.mutate(action.status)}
                  disabled={statusMutation.isPending}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${action.className}`}
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Share link */}
          <div className="mt-4 rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t.offers.shareOfferLink}</p>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <Copy className="h-4 w-4" /> {t.offers.copyLink}
              </button>
              <a href={getPublicLink()} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <LinkIcon className="h-4 w-4" /> {t.offers.openLink}
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/offers/${id}/edit`}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <Edit className="h-4 w-4" /> {t.offers.editOffer}
            </Link>
            <button onClick={handlePdfExport} disabled={generating}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
              <Download className="h-4 w-4" /> {generating ? t.common.generating : t.common.downloadPdf}
            </button>
            {acceptance && (
              <button onClick={handleConfirmationPdf} disabled={generatingConfirmation}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                <ClipboardCheck className="h-4 w-4" /> {generatingConfirmation ? t.common.generating : t.offers.downloadConfirmation}
              </button>
            )}
            {offer.status === 'accepted' && (
              <button onClick={handleConvertToInvoice} disabled={converting}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <FileText className="h-4 w-4" /> {converting ? t.common.loading : t.offers.convertToInvoice}
              </button>
            )}
            {offer.status === 'accepted' && (
              <button onClick={() => setContractOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                <ScrollText className="h-4 w-4" /> {(t as any).contracts.createFromOffer}
              </button>
            )}
            <button onClick={handleDuplicate} disabled={duplicating}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
              <CopyPlus className="h-4 w-4" /> {duplicating ? t.common.loading : t.offers.duplicateOffer}
            </button>
            <button onClick={() => setEmailOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <Mail className="h-4 w-4" /> {t.email.prepareEmail}
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 font-semibold text-foreground">{t.offers.items}</h3>
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    <p className="text-muted-foreground">{item.quantity} × {formatEUR(item.unit_price)}</p>
                  </div>
                  <p className="font-medium text-foreground">{formatEUR(item.total)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.offers.subtotal}</span><span>{formatEUR(offer.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.offers.taxTotal}</span><span>{formatEUR(offer.tax_total)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t.offers.grandTotal}</span><span>{formatEUR(offer.grand_total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Email History */}
        {sentEmails.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
              <Mail className="h-4 w-4" /> {t.email.emailHistory}
            </h3>
            <div className="space-y-2">
              {sentEmails.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <span className="text-foreground">{t.email.sentAt} {formatDateDE(e.sent_at)}</span>
                  <span className="text-xs text-muted-foreground">{e.recipient_email}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        recipientEmail={(offer as any)?.customer?.email || ''}
        defaultSubject={t.email.offerSubject.replace('{company}', settings?.business_name || '')}
        defaultBody={t.email.offerBody.replace(/{number}/g, offer?.offer_number || '')}
        pdfGenerator={getOfferPdfBase64}
        pdfFilename={`${offer?.offer_number}.pdf`}
        documentType="offer"
        documentId={id!}
        onSent={() => queryClient.invalidateQueries({ queryKey: ['document-emails', 'offer', id] })}
      />

      {offer && (
        <ContractSetupModal
          open={contractOpen}
          onClose={() => setContractOpen(false)}
          offerId={id!}
          customerId={offer.customer_id}
          offerNumber={offer.offer_number}
          items={items}
          subtotal={offer.subtotal}
          taxTotal={offer.tax_total}
          grandTotal={offer.grand_total}
        />
      )}
    </div>
  );
};

export default OfferDetail;
