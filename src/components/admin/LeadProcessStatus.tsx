import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Check, Circle, Minus, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type StepState = 'completed' | 'open' | 'not_started' | 'not_linked';

interface PipelineStep {
  key: string;
  label: string;
  state: StepState;
  detail?: string;
  linkTo?: string;
}

interface LeadProcessStatusProps {
  leadEmail: string;
  hasBooking: boolean;
  onClose?: () => void;
}

const STATE_STYLES: Record<StepState, { className: string }> = {
  completed: { className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700' },
  open: { className: 'bg-yellow-900/50 text-yellow-400 border-yellow-700' },
  not_started: { className: 'bg-muted text-muted-foreground border-border' },
  not_linked: { className: 'bg-muted text-muted-foreground/50 border-border' },
};

const LeadProcessStatus = ({ leadEmail, hasBooking, onClose }: LeadProcessStatusProps) => {
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!leadEmail) return;
    loadPipeline();
  }, [leadEmail, hasBooking]);

  const loadPipeline = async () => {
    setLoading(true);

    // Find customer by email
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('email', leadEmail);

    const customerIds = (customers || []).map(c => c.id);

    let offers: any[] = [];
    let invoices: any[] = [];
    let contracts: any[] = [];

    if (customerIds.length > 0) {
      const [offersRes, invoicesRes, contractsRes] = await Promise.all([
        supabase.from('offers').select('id, offer_number, status, grand_total, customer_id').in('customer_id', customerIds),
        supabase.from('invoices').select('id, invoice_number, status, grand_total, customer_id, source_offer_id').in('customer_id', customerIds),
        supabase.from('contracts').select('id, contract_number, status, grand_total, customer_id, source_offer_id').in('customer_id', customerIds),
      ]);
      offers = offersRes.data || [];
      invoices = invoicesRes.data || [];
      contracts = contractsRes.data || [];
    }

    const hasOffer = offers.length > 0;
    const acceptedOffer = offers.find(o => o.status === 'accepted');
    const hasContract = contracts.length > 0;
    const hasInvoice = invoices.length > 0;
    const paidInvoice = invoices.find(i => i.status === 'paid');

    const pipeline: PipelineStep[] = [
      {
        key: 'lead',
        label: 'Lead erfasst',
        state: 'completed',
      },
      {
        key: 'booking',
        label: 'Termin gebucht',
        state: hasBooking ? 'completed' : 'not_started',
      },
      {
        key: 'offer',
        label: 'Angebot erstellt',
        state: hasOffer
          ? 'completed'
          : customerIds.length > 0
            ? 'not_started'
            : 'not_linked',
        detail: hasOffer ? `${offers[0].offer_number}` : undefined,
        linkTo: hasOffer ? `/admin/documents/offers/${offers[0].id}` : undefined,
      },
      {
        key: 'offer_accepted',
        label: 'Angebot angenommen',
        state: acceptedOffer
          ? 'completed'
          : hasOffer
            ? 'open'
            : 'not_started',
        detail: acceptedOffer ? acceptedOffer.offer_number : undefined,
        linkTo: acceptedOffer ? `/admin/documents/offers/${acceptedOffer.id}` : undefined,
      },
      {
        key: 'contract',
        label: 'Vertrag erstellt',
        state: hasContract
          ? 'completed'
          : acceptedOffer
            ? 'not_started'
            : 'not_started',
        detail: hasContract ? contracts[0].contract_number : undefined,
        linkTo: hasContract ? `/admin/documents/contracts/${contracts[0].id}` : undefined,
      },
      {
        key: 'invoice',
        label: 'Rechnung erstellt',
        state: hasInvoice
          ? 'completed'
          : 'not_started',
        detail: hasInvoice ? invoices[0].invoice_number : undefined,
        linkTo: hasInvoice ? `/admin/documents/invoices/${invoices[0].id}` : undefined,
      },
      {
        key: 'paid',
        label: 'Rechnung bezahlt',
        state: paidInvoice
          ? 'completed'
          : hasInvoice
            ? 'open'
            : 'not_started',
        detail: paidInvoice ? `${paidInvoice.invoice_number}` : undefined,
        linkTo: paidInvoice ? `/admin/documents/invoices/${paidInvoice.id}` : undefined,
      },
    ];

    setSteps(pipeline);

    // Determine next action
    if (!hasBooking) setNextAction('Termin vereinbaren');
    else if (!hasOffer) setNextAction('Angebot erstellen');
    else if (!acceptedOffer) setNextAction('Angebot nachfassen');
    else if (!hasContract && !hasInvoice) setNextAction('Vertrag oder Rechnung erstellen');
    else if (hasInvoice && !paidInvoice) setNextAction('Zahlung prüfen');
    else if (paidInvoice) setNextAction(null);
    else setNextAction(null);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="border-t border-border px-6 py-4">
        <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">PROZESSSTATUS</p>
        <div className="flex justify-center py-4">
          <div className="h-4 w-4 animate-spin rounded-full border border-foreground border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border px-6 py-4">
      <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">PROZESSSTATUS</p>

      <div className="space-y-1">
        {steps.map((step, i) => {
          const style = STATE_STYLES[step.state];
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0', style.className)}>
                  {step.state === 'completed' ? (
                    <Check className="w-3 h-3" />
                  ) : step.state === 'not_linked' ? (
                    <Minus className="w-3 h-3" />
                  ) : (
                    <Circle className="w-2 h-2" />
                  )}
                </div>
                {!isLast && (
                  <div className={cn('w-px h-3', step.state === 'completed' ? 'bg-emerald-700/50' : 'bg-border')} />
                )}
              </div>

              {/* Step content */}
              <div className="flex items-center justify-between flex-1 min-w-0 -mt-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('text-xs font-medium', step.state === 'completed' ? 'text-foreground' : 'text-muted-foreground')}>
                    {step.label}
                  </span>
                  {step.detail && (
                    <span className="text-[10px] text-muted-foreground/60">{step.detail}</span>
                  )}
                </div>
                {step.linkTo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose?.();
                      navigate(step.linkTo!);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 shrink-0"
                  >
                    Öffnen <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next action hint */}
      {nextAction && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/50">
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-muted-foreground">
            Nächster Schritt: {nextAction}
          </span>
        </div>
      )}
    </div>
  );
};

export default LeadProcessStatus;
