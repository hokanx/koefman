import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { generatePdf } from '@/lib/generatePdf';
import { formatAddress } from '@/types';
import { formatDateDE, formatEUR, formatNumber } from '@/lib/utils';

interface ExportOptions {
  userId: string;
  from: string;
  to: string;
  businessSettings: any;
  /** Optional callback for progress updates (0–100) */
  onProgress?: (percent: number, label: string) => void;
}

export async function generateTaxExportZip(options: ExportOptions): Promise<Blob> {
  const { userId, from, to, businessSettings, onProgress } = options;
  const zip = new JSZip();
  const rechnungenFolder = zip.folder('Rechnungen')!;
  const angeboteFolder = zip.folder('Angebote')!;
  const ausgabenFolder = zip.folder('Ausgaben')!;
  const bankFolder = zip.folder('Bank')!;
  const vertraegeFolder = zip.folder('Vertraege')!;

  const progress = (p: number, l: string) => onProgress?.(Math.round(p), l);
  progress(0, 'Daten laden…');

  const isSmallBiz = !!businessSettings?.small_business_regulation;
  const today = new Date().toISOString().split('T')[0];

  // Helper to build business info block (reused for invoices & offers)
  const businessInfo = {
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
  };

  // ── 1. FETCH DATA ──────────────────────────────────────────────

  const [{ data: invoices = [] }, { data: offers = [] }, { data: docs = [] }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date'),
    supabase
      .from('offers')
      .select('*, customer:customers(*)')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date'),
    supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .in('status', ['geprueft', 'verarbeitet'])
      .order('created_at'),
  ]);

  const totalDocs = invoices.length + offers.length + docs.length;
  let processedDocs = 0;

  // ── 2. GENERATE INVOICE PDFs ───────────────────────────────────

  progress(5, 'Rechnungen erstellen…');

  for (const inv of invoices) {
    if (inv.status === 'cancelled') { processedDocs++; continue; }

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
          business: businessInfo,
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

    processedDocs++;
    progress(5 + (processedDocs / totalDocs) * 70, `${inv.invoice_number}…`);
  }

  // ── 3. GENERATE OFFER PDFs ─────────────────────────────────────

  progress(50, 'Angebote erstellen…');

  for (const offer of offers) {
    if (offer.status === 'draft') { processedDocs++; continue; }

    const { data: items = [] } = await supabase
      .from('offer_items')
      .select('*')
      .eq('offer_id', offer.id)
      .order('sort_order');

    const customer = offer.customer as any;
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
          type: 'offer',
          documentTitle: 'Angebot',
          documentNumber: offer.offer_number,
          date: offer.date,
          business: businessInfo,
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
          subtotal: Number(offer.subtotal),
          tax_total: Number(offer.tax_total),
          grand_total: Number(offer.grand_total),
          intro_text: offer.intro_text || undefined,
          footer_text: offer.footer_text || undefined,
          closing_text: offer.closing_text || undefined,
          notes: offer.notes || undefined,
          small_business_regulation: isSmallBiz,
          labels: {
            date: 'Angebotsdatum',
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
        const safeNumber = offer.offer_number.replace(/[^a-zA-Z0-9_-]/g, '_');
        angeboteFolder.file(`${safeNumber}.pdf`, pdfData, { base64: true });
      }
    } catch (e) {
      console.error(`PDF generation failed for ${offer.offer_number}`, e);
    }

    processedDocs++;
    progress(5 + (processedDocs / totalDocs) * 70, `${offer.offer_number}…`);
  }

  // ── 4. GENERATE CSV ────────────────────────────────────────────

  progress(80, 'CSV erstellen…');

  const relevantInvoices = invoices.filter((inv: any) => inv.status !== 'cancelled');
  const csvHeader = [
    'Rechnungsnummer',
    'Rechnungsdatum',
    'Fälligkeitsdatum',
    'Kunde',
    'Betrag Netto',
    'Umsatzsteuer',
    'Betrag Brutto',
    'Status',
    'Zahlungsdatum',
  ];
  const csvRows = relevantInvoices.map((inv: any) => {
    const customer = inv.customer as any;
    const isOverdue = (inv.status === 'open' || inv.status === 'draft') && inv.due_date && inv.due_date < today;
    let status = 'offen';
    if (inv.status === 'paid') status = 'bezahlt';
    else if (isOverdue) status = 'überfällig';

    return [
      inv.invoice_number,
      formatDateDE(inv.date),
      formatDateDE(inv.due_date),
      customer?.name || '',
      formatNumber(inv.subtotal),
      formatNumber(inv.tax_total),
      formatNumber(inv.grand_total),
      status,
      inv.status === 'paid' ? formatDateDE(inv.updated_at) : '',
    ];
  });

  const csvContent = [csvHeader, ...csvRows].map((r) => r.join(';')).join('\n');
  zip.file('zusammenfassung.csv', '\uFEFF' + csvContent);

  // ── 5. GENERATE SUMMARY.TXT ────────────────────────────────────

  progress(90, 'Zusammenfassung erstellen…');

  let totalNet = 0, totalTax = 0, totalGross = 0, paid = 0, open = 0, overdue = 0;
  for (const inv of relevantInvoices) {
    totalNet += Number(inv.subtotal);
    totalTax += Number(inv.tax_total);
    totalGross += Number(inv.grand_total);
    if (inv.status === 'paid') {
      paid += Number(inv.grand_total);
    } else {
      const isOverdue = inv.due_date && inv.due_date < today;
      if (isOverdue) {
        overdue += Number(inv.grand_total);
      } else {
        open += Number(inv.grand_total);
      }
    }
  }

  const relevantOffers = offers.filter((o: any) => o.status !== 'draft');

  const summaryLines = [
    `Finanzübersicht – ${businessSettings?.business_name || ''}`,
    ``,
    `Zeitraum: ${formatDateDE(from)} – ${formatDateDE(to)}`,
    `Erstellt am: ${formatDateDE(new Date())}`,
    ``,
    `── Rechnungen ──`,
    `Anzahl Rechnungen: ${relevantInvoices.length}`,
    `Summe netto: ${formatEUR(totalNet)}`,
    ...(isSmallBiz ? [] : [`Summe Umsatzsteuer: ${formatEUR(totalTax)}`]),
    `Summe brutto: ${formatEUR(totalGross)}`,
    `Bezahlt: ${formatEUR(paid)}`,
    `Offen: ${formatEUR(open)}`,
    `Überfällig: ${formatEUR(overdue)}`,
    ``,
    `── Angebote ──`,
    `Anzahl Angebote: ${relevantOffers.length}`,
    ``,
    `── Steuerstatus ──`,
    `Steuermodus: ${isSmallBiz ? 'Kleinunternehmerregelung §19 UStG' : 'Umsatzsteuer aktiv'}`,
    ...(businessSettings?.tax_number ? [`Steuernummer: ${businessSettings.tax_number}`] : []),
    ...(businessSettings?.vat_id ? [`USt-IdNr: ${businessSettings.vat_id}`] : []),
  ];

  zip.file('zusammenfassung.txt', summaryLines.join('\n'));

  progress(95, 'ZIP erstellen…');
  const blob = await zip.generateAsync({ type: 'blob' });
  progress(100, 'Fertig');
  return blob;
}
