import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateDE } from '@/lib/utils';
import { DocumentShell, DocumentHeader, DocumentMeta, ItemsTable, TotalsBlock, BankDetails } from '@/components/public-document';
import type { Tables } from '@/integrations/supabase/types';

type InvoiceRow = Tables<'invoices'>;
type InvoiceCustomer = Pick<Tables<'customers'>, 'name' | 'email' | 'street' | 'house_number' | 'postal_code' | 'city'>;
type InvoiceWithCustomer = InvoiceRow & { customer: InvoiceCustomer | null };

const PublicInvoiceView = () => {
  const { token } = useParams<{ token: string }>();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['public-invoice', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(name, email, street, house_number, postal_code, city)')
        .eq('public_token', token!)
        .single();
      if (error) throw error;
      return data as InvoiceWithCustomer;
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
        .select('business_name, owner_name, email, phone, website, street, house_number, postal_code, city, tax_number, vat_id, iban, bic, bank_name, account_holder, payment_terms, small_business_regulation, logo_url')
        .eq('user_id', invoice!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!invoice?.user_id,
  });

  const customer = invoice ? invoice.customer : null;
  const isSmallBiz = settings?.small_business_regulation;
  const isPaid = invoice?.status === 'paid';
  const isOverdue = !isPaid && invoice?.due_date && new Date(invoice.due_date) < new Date();

  return (
    <DocumentShell isLoading={isLoading} showNotFound={!isLoading && (!!error || !invoice)} notFoundMessage="Rechnung nicht gefunden" footerInfo={settings ? { businessName: settings.business_name, ownerName: settings.owner_name ?? undefined, address: [settings.street, settings.house_number].filter(Boolean).join(' ') + (settings.postal_code || settings.city ? ', ' + [settings.postal_code, settings.city].filter(Boolean).join(' ') : ''), phone: settings.phone ?? undefined, email: settings.email ?? undefined, website: settings.website ?? undefined, taxNumber: settings.tax_number ?? undefined } : undefined}>
      <DocumentHeader
        businessName={settings?.business_name}
        street={settings?.street ?? undefined}
        houseNumber={settings?.house_number ?? undefined}
        postalCode={settings?.postal_code ?? undefined}
        city={settings?.city ?? undefined}
        logoUrl={settings?.logo_url ?? undefined}
        email={settings?.email ?? undefined}
        phone={settings?.phone ?? undefined}
        taxNumber={settings?.tax_number ?? undefined}
        vatId={settings?.vat_id ?? undefined}
        website={settings?.website ?? undefined}
        recipientName={customer?.name}
        recipientAddress={customer ? [customer.street && customer.house_number ? `${customer.street} ${customer.house_number}` : customer.street, customer.postal_code && customer.city ? `${customer.postal_code} ${customer.city}` : customer.city].filter(Boolean).join('\n') : undefined}
      />

      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-7 py-6 space-y-6">
        <DocumentMeta
          title="Rechnung"
          serviceTypeLabel={invoice?.source_recurring_id ? 'Wiederkehrend' : 'Einmalig'}
          fields={[
            { label: 'Rechnungsnummer', value: invoice?.invoice_number || '' },
            { label: 'Rechnungsdatum', value: formatDateDE(invoice?.date) },
            { label: 'Fällig am', value: formatDateDE(invoice?.due_date), highlight: !!isOverdue },
            ...(settings?.payment_terms ? [{ label: 'Zahlungsbedingungen', value: settings.payment_terms }] : []),
          ]}
        >
          {isPaid && (
            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700 font-medium">
              ✓ Bezahlt
            </div>
          )}
        </DocumentMeta>

        {/* Intro text */}
        {invoice?.intro_text && (
          <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.intro_text}</p>
        )}

        {/* Items */}
        {items.length > 0 && (
          <>
            <ItemsTable items={items} isSmallBusiness={!!isSmallBiz} />
            <TotalsBlock
              subtotal={invoice?.subtotal || 0}
              taxTotal={invoice?.tax_total || 0}
              grandTotal={invoice?.grand_total || 0}
              isSmallBusiness={!!isSmallBiz}
            />
          </>
        )}

        {/* Footer / closing text */}
        {invoice?.footer_text && (
          <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.footer_text}</p>
        )}
        {invoice?.closing_text && (
          <p className="text-sm text-gray-700">{invoice.closing_text}</p>
        )}

        {/* Bank details */}
        <BankDetails
          accountHolder={settings?.account_holder}
          bankName={settings?.bank_name}
          iban={settings?.iban}
          bic={settings?.bic}
          referenceNumber={invoice?.invoice_number}
        />
      </div>
    </DocumentShell>
  );
};

export default PublicInvoiceView;
