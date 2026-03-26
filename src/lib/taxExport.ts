import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { generatePdf, formatDateDE } from '@/lib/generatePdf';
import { formatAddress } from '@/types';

interface ExportOptions {
  userId: string;
  from: string;
  to: string;
  businessSettings: any;
}

export async function generateTaxExportZip(options: ExportOptions): Promise<Blob> {
  const { userId, from, to, businessSettings } = options;
  const zip = new JSZip();
  const rechnungenFolder = zip.folder('Rechnungen')!;

  // 1. Fetch invoices with customers in date range
  const { data: invoices = [] } = await supabase
    .from('invoices')
    .select('*, customer:customers(*)')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date');

  const isSmallBiz = !!businessSettings?.small_business_regulation;
  const today = new Date().toISOString().split('T')[0];

  // 2. Generate PDFs for each invoice
  for (const inv of invoices) {
    if (inv.status === 'cancelled') continue;

    // Fetch items for this invoice
    const { data: items = [] } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order');

    const customer = inv.customer as any;
    const customerAddress = customer
      ? formatAddress({
          street: customer.street,
          house_number: customer.house_number,
          postal_code: customer.postal_code,
          city: customer.city,
          country: customer.country,
          address: customer.address,
        })
      : '';

    try {
      const base64 = await generatePdf(
        {
          type: 'invoice',
          documentTitle: 'Rechnung',
          documentNumber: inv.invoice_number,
          date: inv.date,
          dueDate: inv.due_date,
          business: {
            business_name: businessSettings?.business_name || '',
            address: formatAddress({
              street: businessSettings?.street,
              house_number: businessSettings?.house_number,
              postal_code: businessSettings?.postal_code,
              city: businessSettings?.city,
              country: businessSettings?.country,
              address: businessSettings?.address,
            }),
            email: businessSettings?.email,
            phone: businessSettings?.phone,
            tax_number: businessSettings?.tax_number,
            vat_id: businessSettings?.vat_id,
            logo_url: businessSettings?.logo_url,
            payment_terms: businessSettings?.payment_terms,
            account_holder: businessSettings?.account_holder,
            bank_name: businessSettings?.bank_name,
            iban: businessSettings?.iban,
            bic: businessSettings?.bic,
            owner_name: businessSettings?.owner_name,
          },
          customer: {
            name: customer?.name || '',
            address: customerAddress,
            email: customer?.email,
            phone: customer?.phone,
          },
          items: items.map((it: any) => ({
            title: it.title,
            description: it.description,
            quantity: Number(it.quantity),
            unit: it.unit,
            unit_price: Number(it.unit_price),
            tax_rate: Number(it.tax_rate),
            total: Number(it.total),
          })),
          subtotal: Number(inv.subtotal),
          tax_total: Number(inv.tax_total),
          grand_total: Number(inv.grand_total),
          intro_text: inv.intro_text || undefined,
          footer_text: inv.footer_text || undefined,
          closing_text: inv.closing_text || undefined,
          notes: inv.notes || undefined,
          small_business_regulation: isSmallBiz,
          labels: {
            date: 'Rechnungsdatum',
            dueDate: 'Fällig am',
            quantity: 'Menge',
            unit: 'Einheit',
            unitPrice: 'Einzelpreis',
            taxRate: 'USt %',
            total: 'Gesamt',
            subtotal: 'Zwischensumme',
            taxTotal: 'Umsatzsteuer',
            grandTotal: 'Gesamtbetrag',
            description: 'Beschreibung',
            itemTitle: 'Bezeichnung',
            page: 'Seite',
          },
        },
        true,
      );

      if (base64 && typeof base64 === 'string') {
        const pdfData = base64.split(',')[1] || base64;
        const safeNumber = inv.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_');
        rechnungenFolder.file(`${safeNumber}.pdf`, pdfData, { base64: true });
      }
    } catch (e) {
      console.error(`PDF generation failed for ${inv.invoice_number}`, e);
    }
  }

  // 3. Generate CSV
  const relevantInvoices = invoices.filter((inv: any) => inv.status !== 'cancelled');
  const csvHeader = ['Rechnungsnummer', 'Rechnungsdatum', 'Kunde', 'Betrag Netto', 'Umsatzsteuer', 'Betrag Brutto', 'Status', 'Zahlungsdatum'];
  const csvRows = relevantInvoices.map((inv: any) => {
    const customer = inv.customer as any;
    const isOverdue = (inv.status === 'open' || inv.status === 'draft') && inv.due_date && inv.due_date < today;
    let status = 'offen';
    if (inv.status === 'paid') status = 'bezahlt';
    else if (isOverdue) status = 'überfällig';

    return [
      inv.invoice_number,
      formatDateDE(inv.date),
      customer?.name || '',
      fmt(inv.subtotal),
      fmt(inv.tax_total),
      fmt(inv.grand_total),
      status,
      inv.status === 'paid' ? formatDateDE(inv.updated_at) : '',
    ];
  });

  const csvContent = [csvHeader, ...csvRows].map((r) => r.join(';')).join('\n');
  zip.file('zusammenfassung.csv', '\uFEFF' + csvContent);

  // 4. Generate summary.txt
  let totalNet = 0, totalTax = 0, totalGross = 0, paid = 0, open = 0;
  for (const inv of relevantInvoices) {
    totalNet += Number(inv.subtotal);
    totalTax += Number(inv.tax_total);
    totalGross += Number(inv.grand_total);
    if (inv.status === 'paid') paid += Number(inv.grand_total);
    else open += Number(inv.grand_total);
  }

  const summaryLines = [
    `Finanzübersicht – ${businessSettings?.business_name || ''}`,
    ``,
    `Zeitraum: ${formatDateDE(from)} – ${formatDateDE(to)}`,
    `Erstellt am: ${formatDateDE(new Date())}`,
    ``,
    `Anzahl Rechnungen: ${relevantInvoices.length}`,
    `Summe netto: ${fmtEur(totalNet)}`,
    ...(isSmallBiz ? [] : [`Summe Umsatzsteuer: ${fmtEur(totalTax)}`]),
    `Summe brutto: ${fmtEur(totalGross)}`,
    `Bezahlt: ${fmtEur(paid)}`,
    `Offen: ${fmtEur(open)}`,
    ``,
    `Steuerstatus: ${isSmallBiz ? 'Kleinunternehmerregelung §19 UStG' : 'Umsatzsteuer aktiv'}`,
    ...(businessSettings?.tax_number ? [`Steuernummer: ${businessSettings.tax_number}`] : []),
    ...(businessSettings?.vat_id ? [`USt-IdNr: ${businessSettings.vat_id}`] : []),
  ];

  zip.file('zusammenfassung.txt', summaryLines.join('\n'));

  return zip.generateAsync({ type: 'blob' });
}

function fmt(val: any): string {
  return Number(val).toFixed(2).replace('.', ',');
}

function fmtEur(val: number): string {
  return val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
