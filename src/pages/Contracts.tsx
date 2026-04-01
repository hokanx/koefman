import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE, generateContractPdf, generateContractConfirmationPdf } from '@/lib/generatePdf';
import { formatAddress } from '@/types';
import { Button } from '@/components/ui/button';
import { Pause, Play, XCircle, Download, RepeatIcon, Send, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import EmailModal from '@/components/shared/EmailModal';
import { formatEUR } from '@/lib/utils';
import { useOrgTaxMode } from '@/hooks/useOrgTaxMode';

const frequencyLabels: Record<string, Record<string, string>> = {
  weekly: { de: 'Wöchentlich', en: 'Weekly', ar: 'أسبوعياً' },
  every_2_weeks: { de: 'Alle 2 Wochen', en: 'Every 2 weeks', ar: 'كل أسبوعين' },
  monthly: { de: 'Monatlich', en: 'Monthly', ar: 'شهرياً' },
  quarterly: { de: 'Vierteljährlich', en: 'Quarterly', ar: 'ربع سنوي' },
};

const Contracts = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ct = (t as any).contracts;
  const { isKleinunternehmer } = useOrgTaxMode();

  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, customer:customers(name, email), source_offer:offers(offer_number)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('contracts').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(ct.updated);
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailContract, setEmailContract] = useState<any>(null);

  const handleSendContract = async (contract: any) => {
    // Ensure public token exists
    let publicToken = (contract as any).public_token;
    if (!publicToken) {
      publicToken = crypto.randomUUID();
      await supabase.from('contracts').update({ public_token: publicToken } as any).eq('id', contract.id);
    }
    // Mark as sent if still draft
    if (contract.status === 'entwurf') {
      await supabase.from('contracts').update({ status: 'gesendet' } as any).eq('id', contract.id);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(ct.contractSent);
    }
    // Open email modal with updated token
    setEmailContract({ ...contract, public_token: publicToken });
    setEmailOpen(true);
  };

  const handleCopyLink = async (contract: any) => {
    const publicToken = (contract as any).public_token;
    if (publicToken) {
      const url = `${window.location.origin}/contract/view/${publicToken}`;
      await navigator.clipboard.writeText(url);
      toast.success(ct.linkCopied);
    }
  };

  const handleDownloadPdf = async (contract: any) => {
    setGeneratingPdf(contract.id);
    try {
      const { data: contractItems } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract.id)
        .order('sort_order');

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', contract.customer_id)
        .single();

      // Fetch signature data if contract is signed
      let signatureData: { signedByName: string; signedAt: string; signatureImage: string | null } | undefined;
      if (contract.status === 'unterzeichnet' || contract.status === 'aktiv') {
        const { data: acceptance } = await supabase
          .from('contract_acceptances')
          .select('*')
          .eq('contract_id', contract.id)
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (acceptance) {
          signatureData = {
            signedByName: (acceptance as any).accepted_by_name || 'Unbekannt',
            signedAt: (acceptance as any).accepted_at
              ? new Date((acceptance as any).accepted_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Unbekannt',
            signatureImage: (acceptance as any).signature_image || null,
          };
        }
      }

      const businessAddress = settings ? formatAddress(settings as any) : '';
      const customerAddress = customer ? formatAddress(customer) : '';
      const isSmallBiz = isKleinunternehmer;

      await generateContractPdf({
        contractNumber: contract.contract_number,
        title: contract.title,
        date: formatDateDE(contract.created_at),
        startDate: formatDateDE(contract.start_date),
        endDate: contract.end_date ? formatDateDE(contract.end_date) : null,
        frequency: frequencyLabels[contract.frequency]?.[language] || contract.frequency,
        sourceOfferNumber: contract.source_offer?.offer_number || '',
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
        items: (contractItems || []).map((i: any) => ({
          title: i.title,
          description: i.description,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          tax_rate: i.tax_rate,
          total: i.total,
        })),
        subtotal: contract.subtotal,
        tax_total: contract.tax_total,
        grand_total: contract.grand_total,
        small_business_regulation: isSmallBiz,
        signatureData,
        labels: {
          date: t.offers.date,
          quantity: t.offers.quantity,
          unit: t.offers.unit,
          unitPrice: t.offers.unitPrice,
          taxRate: t.offers.taxRate,
          total: t.offers.total,
          subtotal: t.offers.subtotal,
          taxTotal: t.offers.taxTotal,
          grandTotal: t.offers.grandTotal,
          description: t.offers.description,
          itemTitle: t.offers.itemTitle,
          page: 'Seite',
          frequencyLabel: ct.pdfFrequencyLabel,
          startLabel: ct.pdfStartLabel,
          endLabel: ct.pdfEndLabel,
          durationOpen: ct.pdfDurationOpen,
          refOffer: ct.pdfRefOffer,
          sectionScope: ct.pdfSectionScope,
          sectionExecution: ct.pdfSectionExecution,
          sectionCompensation: ct.pdfSectionCompensation,
          sectionDuration: ct.pdfSectionDuration,
          sectionFinal: ct.pdfSectionFinal,
          contractorLabel: ct.pdfContractorLabel,
          clientLabel: ct.pdfClientLabel,
          introText: ct.pdfIntroText,
          scopeIntro: ct.pdfScopeIntro,
          executionText: ct.pdfExecutionText,
          compensationText: ct.pdfCompensationText,
          durationText: ct.pdfDurationText,
          durationOpenText: ct.pdfDurationOpenText,
          finalText: ct.pdfFinalText,
          signaturePlace: ct.pdfSignaturePlace,
          signatureDateLabel: ct.pdfSignatureDateLabel,
          signatureContractor: ct.pdfSignatureContractor,
          signatureClient: ct.pdfSignatureClient,
          paymentTerms: (settings as any)?.payment_terms || ct.pdfPaymentTerms,
          perCycle: ct.pdfPerCycle,
        },
        closing_text: (settings as any)?.default_closing_text || 'Mit freundlichen Grüßen',
      });
    } catch {
      toast.error(t.common.error);
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleActivateRecurring = async (contract: any) => {
    if (!user) return;
    // Gate: must be signed
    if (contract.status !== 'unterzeichnet' && contract.status !== 'aktiv') {
      toast.error(ct.mustBeSignedForRecurring);
      return;
    }
    try {
      // Check if recurring already exists for this contract
      const { data: existingRecurring } = await supabase
        .from('recurring_invoices')
        .select('id')
        .eq('source_contract_id', contract.id)
        .maybeSingle();
      if (existingRecurring) {
        toast.error('Wiederkehrende Rechnungen wurden bereits für diesen Vertrag aktiviert.');
        return;
      }
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const prefix = settings?.invoice_number_prefix || 'RE-';
      const { data: contractItems } = await supabase.from('contract_items').select('*').eq('contract_id', contract.id).order('sort_order');

      const invoiceNumber = `${prefix}${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: invoice, error: invoiceError } = await supabase.from('invoices').insert({
        user_id: user.id,
        customer_id: contract.customer_id,
        invoice_number: invoiceNumber,
        date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'open',
        subtotal: contract.subtotal,
        tax_total: contract.tax_total,
        grand_total: contract.grand_total,
        intro_text: (settings as any)?.default_invoice_intro_text || '',
        footer_text: (settings as any)?.default_invoice_footer_text || '',
        closing_text: (settings as any)?.default_closing_text || '',
      } as any).select().single();
      if (invoiceError) throw invoiceError;

      if (contractItems && contractItems.length > 0) {
        await supabase.from('invoice_items').insert(
          contractItems.map((item: any, i: number) => ({
            invoice_id: invoice!.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            total: item.total,
            sort_order: i,
          }))
        );
      }

      const calcNextRun = (freq: string): string => {
        const d = new Date();
        switch (freq) {
          case 'weekly': d.setDate(d.getDate() + 7); break;
          case 'every_2_weeks': d.setDate(d.getDate() + 14); break;
          case 'monthly': d.setMonth(d.getMonth() + 1); break;
          case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        }
        return d.toISOString().split('T')[0];
      };

      await supabase.from('recurring_invoices').insert({
        user_id: user.id,
        source_invoice_id: invoice!.id,
        customer_id: contract.customer_id,
        frequency: contract.frequency,
        start_date: contract.start_date,
        next_run_date: calcNextRun(contract.frequency),
        end_date: contract.end_date || null,
        status: 'active',
        auto_generate: true,
        source_contract_id: contract.id,
      } as any);

      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(ct.recurringActivated);
    } catch {
      toast.error(t.common.error);
    }
  };

  const handleDownloadConfirmation = async (contract: any) => {
    try {
      const { data: acceptance } = await supabase
        .from('contract_acceptances' as any)
        .select('*')
        .eq('contract_id', contract.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: contractItems } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract.id)
        .order('sort_order');

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', contract.customer_id)
        .single();

      const businessAddress = settings ? formatAddress(settings as any) : '';
      const customerAddress = customer ? formatAddress(customer) : '';

      await generateContractConfirmationPdf({
        contractNumber: contract.contract_number,
        title: contract.title,
        date: formatDateDE(new Date()),
        signedByName: (acceptance as any)?.accepted_by_name || 'Unbekannt',
        signedAt: (acceptance as any)?.accepted_at
          ? new Date((acceptance as any).accepted_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'Unbekannt',
        signatureImage: (acceptance as any)?.signature_image || null,
        business: {
          business_name: settings?.business_name || '',
          address: businessAddress || undefined,
          email: settings?.email || undefined,
          phone: settings?.phone || undefined,
          tax_number: settings?.tax_number || undefined,
          logo_url: settings?.logo_url || undefined,
        },
        customer: {
          name: customer?.name || '',
          address: customerAddress || undefined,
        },
        items: (contractItems || []).map((i: any) => ({
          title: i.title, description: i.description, quantity: i.quantity,
          unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total,
        })),
        subtotal: contract.subtotal,
        tax_total: contract.tax_total,
        grand_total: contract.grand_total,
        frequency: frequencyLabels[contract.frequency]?.[language] || contract.frequency,
        startDate: formatDateDE(contract.start_date),
        endDate: contract.end_date ? formatDateDE(contract.end_date) : null,
        small_business_regulation: isKleinunternehmer,
      });
    } catch {
      toast.error(t.common.error);
    }
  };

  const statusMap: Record<string, string> = {
    entwurf: 'draft',
    active: 'draft',
    gesendet: 'sent',
    aktiv: 'accepted',
    unterzeichnet: 'paid',
    abgelehnt: 'cancelled',
    paused: 'draft',
    ended: 'cancelled',
  };
  const statusLabel: Record<string, string> = {
    entwurf: 'Entwurf',
    active: ct.active,
    gesendet: ct.sent,
    aktiv: 'Aktiv',
    unterzeichnet: ct.signed,
    abgelehnt: ct.rejected,
    paused: ct.paused,
    ended: ct.ended,
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">{ct.title}</h1>

      {contracts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{ct.noContracts}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{c.contract_number}</p>
                  <p className="text-sm text-muted-foreground">{c.customer?.name}</p>
                  <p className="text-xs text-muted-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">Leistungsart: Wiederkehrend ({frequencyLabels[c.frequency]?.[language] || c.frequency})</p>
                </div>
                <StatusBadge
                  status={statusMap[c.status] as any || 'draft'}
                  label={statusLabel[c.status] || c.status}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-xs font-medium">{ct.frequency}</span>
                  <p className="text-foreground">{frequencyLabels[c.frequency]?.[language] || c.frequency}</p>
                </div>
                <div>
                  <span className="text-xs font-medium">{ct.startDate}</span>
                  <p className="text-foreground">{formatDateDE(c.start_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-xs font-medium">{ct.sourceOffer}</span>
                  <button
                    onClick={() => navigate(`/offers/${c.source_offer_id}`)}
                    className="block text-primary hover:underline"
                  >
                    {c.source_offer?.offer_number || '–'}
                  </button>
                </div>
                <div>
                  <span className="text-xs font-medium">{t.offers.grandTotal}</span>
                  <p className="text-foreground font-medium">{formatEUR(c.grand_total)}</p>
                </div>
              </div>

              {c.end_date && (
                <p className="text-xs text-muted-foreground">{ct.endDate}: {formatDateDE(c.end_date)}</p>
              )}

              {/* Signed indicator */}
              {(c.status === 'unterzeichnet' || c.status === 'aktiv') && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-md px-2 py-1 w-fit">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {c.status === 'aktiv' ? 'Aktiv – Digital unterzeichnet' : 'Digital unterzeichnet'}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(c)} disabled={generatingPdf === c.id}>
                  <Download className="h-3.5 w-3.5 mr-1" /> {generatingPdf === c.id ? t.common.generating : ct.downloadPdf}
                </Button>

                {/* Send / Copy link actions for entwurf or gesendet */}
                {(c.status === 'entwurf' || c.status === 'gesendet') && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleSendContract(c)}>
                      <Send className="h-3.5 w-3.5 mr-1" /> {ct.sendContract}
                    </Button>
                    {(c as any).public_token && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleCopyLink(c)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> {ct.copyLink}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          window.open(`${window.location.origin}/contract/view/${(c as any).public_token}`, '_blank');
                        }}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Link öffnen
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* Active: confirmation PDF + recurring */}
                {(c.status === 'unterzeichnet' || c.status === 'aktiv') && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleDownloadConfirmation(c)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Vertragsbestätigung
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleActivateRecurring(c)}>
                      <RepeatIcon className="h-3.5 w-3.5 mr-1" /> {ct.activateRecurring}
                    </Button>
                  </>
                )}

                {/* Pause/Resume/End only for active (signed) contracts */}
                {(c.status === 'unterzeichnet' || c.status === 'aktiv') && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: 'paused' })}>
                    <Pause className="h-3.5 w-3.5 mr-1" /> {ct.pause}
                  </Button>
                )}
                {c.status === 'paused' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: 'aktiv' })}>
                    <Play className="h-3.5 w-3.5 mr-1" /> {ct.resume}
                  </Button>
                )}
                {(c.status === 'unterzeichnet' || c.status === 'aktiv' || c.status === 'paused') && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus.mutate({ id: c.id, status: 'ended' })}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> {ct.end}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {emailContract && (
        <EmailModal
          open={emailOpen}
          onClose={() => { setEmailOpen(false); setEmailContract(null); }}
          recipientEmail={(emailContract as any)?.customer?.email || ''}
          defaultSubject={`Vertrag ${emailContract?.contract_number} von ${settings?.business_name || 'uns'}`}
          defaultBody={`Guten Tag,\n\nanbei erhalten Sie Ihren Vertrag ${emailContract?.contract_number}.\n\nBitte prüfen Sie die Details und bestätigen Sie direkt über den Link.\n\nMit freundlichen Grüßen\n${settings?.business_name || ''}`}
          publicLink={`${window.location.origin}/contract/view/${(emailContract as any)?.public_token}`}
          documentType="contract"
          documentId={emailContract?.id}
          onSent={() => queryClient.invalidateQueries({ queryKey: ['contracts'] })}
        />
      )}
    </div>
  );
};

export default Contracts;
