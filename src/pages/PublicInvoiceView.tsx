import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BrandMark from '@/components/shared/BrandMark';

const formatDateDE = (d: string | null | undefined) => {
  if (!d) return '–';
  const date = new Date(d);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatEUR = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '–';

const PublicInvoiceView = () => {
  const { token } = useParams<{ token: string }>();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(name, email, street, house_number, postal_code, city)')
        .eq('public_token' as any, token!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['public-invoice-items', invoice?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice!.id)
        .order('sort_order');
      return data || [];
    },
    enabled: !!invoice?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ['public-invoice-settings', invoice?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('business_name, owner_name, email, phone, street, house_number, postal_code, city, tax_number, vat_id, iban, bic, bank_name, account_holder, payment_terms, small_business_regulation')
        .eq('user_id', invoice!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!invoice?.user_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <BrandMark variant="wordmark" size="md" align="center" />
          <p className="text-muted-foreground">Rechnung nicht gefunden.</p>
        </div>
      </div>
    );
  }

  const customer = (invoice as any).customer;
  const isSmallBiz = settings?.small_business_regulation;
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <BrandMark variant="wordmark" size="md" align="center" />
          {settings?.business_name && (
            <p className="text-sm text-muted-foreground">{settings.business_name}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          {/* Title */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rechnung</p>
            <h1 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h1>
          </div>

          {/* Status */}
          {isPaid && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 font-medium">
              ✓ Bezahlt
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rechnungsdatum</p>
              <p className="text-foreground">{formatDateDE(invoice.date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Fällig am</p>
              <p className={`text-foreground ${!isPaid && new Date(invoice.due_date) < new Date() ? 'text-destructive font-medium' : ''}`}>
                {formatDateDE(invoice.due_date)}
              </p>
            </div>
            {customer?.name && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Empfänger</p>
                <p className="text-foreground">{customer.name}</p>
              </div>
            )}
            {settings?.payment_terms && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Zahlungsbedingungen</p>
                <p className="text-foreground">{settings.payment_terms}</p>
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Positionen</p>
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && <p className="text-muted-foreground text-xs">{item.description}</p>}
                    <p className="text-muted-foreground text-xs">{item.quantity} × {formatEUR(item.unit_price)}</p>
                  </div>
                  <p className="font-medium text-foreground">{formatEUR(item.total)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            {!isSmallBiz && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Zwischensumme</span><span>{formatEUR(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>MwSt.</span><span>{formatEUR(invoice.tax_total)}</span>
                </div>
              </>
            )}
            <div className={`flex justify-between font-bold text-lg text-foreground ${!isSmallBiz ? 'border-t border-border pt-2' : ''}`}>
              <span>Gesamtbetrag</span><span>{formatEUR(invoice.grand_total)}</span>
            </div>
            {isSmallBiz && (
              <p className="text-xs text-muted-foreground italic">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>
            )}
          </div>

          {/* Payment info */}
          {settings && (settings as any).iban && (
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-1 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Bankverbindung</p>
              {(settings as any).account_holder && <p className="text-foreground">{(settings as any).account_holder}</p>}
              {(settings as any).bank_name && <p className="text-muted-foreground">{(settings as any).bank_name}</p>}
              <p className="text-foreground font-mono text-xs">{(settings as any).iban}</p>
              {(settings as any).bic && <p className="text-muted-foreground text-xs">BIC: {(settings as any).bic}</p>}
              <p className="text-muted-foreground text-xs mt-2">Verwendungszweck: {invoice.invoice_number}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">Bereitgestellt über KÖFMAN</p>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
