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
  isKleinunternehmer?: boolean;
  /** Optional callback for progress updates (0–100) */
  onProgress?: (percent: number, label: string) => void;
}

export async function generateTaxExportZip(options: ExportOptions): Promise<Blob> {
  const { userId, from, to, businessSettings, onProgress } = options;
  const zip = new JSZip();
  const rechnungenFolder = zip.folder('Rechnungen')!;
  const ausgabenFolder = zip.folder('Ausgaben')!;
  const bankFolder = zip.folder('Bank')!;
  const vertraegeFolder = zip.folder('Vertraege')!;

  const progress = (p: number, l: string) => onProgress?.(Math.round(p), l);
  progress(0, 'Daten laden…');

  const isSmallBiz = options.isKleinunternehmer ?? !!businessSettings?.small_business_regulation;
  const today = new Date().toISOString().split('T')[0];

  const businessInfo = buildBusinessInfo(businessSettings);

  // ── 1. FETCH DATA (no offers for tax export) ───────────────────

  const [{ data: invoices = [] }, { data: docs = [] }] = await Promise.all([
    supabase
      .from('invoices')
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

  const totalDocs = invoices.length + docs.length;
  let processedDocs = 0;

  // ── 2. GENERATE INVOICE PDFs ───────────────────────────────────

  progress(5, 'Rechnungen erstellen…');

  for (const inv of invoices) {
    if (inv.status === 'cancelled') { processedDocs++; continue; }
    await generateInvoicePdf(inv, rechnungenFolder, businessInfo, isSmallBiz);
    processedDocs++;
    progress(5 + (processedDocs / totalDocs) * 65, `${inv.invoice_number}…`);
  }

  // ── 3. DOWNLOAD DOCUMENT FILES ─────────────────────────────────

  progress(70, 'Belege herunterladen…');

  const { expenseDocs, incomeDocs } = await downloadDocumentFiles(docs, ausgabenFolder, bankFolder, vertraegeFolder, (p, l) => {
    processedDocs++;
    progress(70 + (processedDocs / totalDocs) * 15, l);
  });

  // ── 4. GENERATE CSVs ──────────────────────────────────────────

  progress(87, 'CSVs erstellen…');

  generateEinnahmenCsv(zip, relevantInvoicesFrom(invoices), incomeDocs, today);
  generateAusgabenCsv(zip, expenseDocs);
  generateZusammenfassungCsv(zip, relevantInvoicesFrom(invoices), expenseDocs, from, to, isSmallBiz, businessSettings);

  // Text summary
  const relevantInvoices = invoices.filter((inv: any) => inv.status !== 'cancelled');
  const { paid, open, overdue, totalNet, totalTax, totalGross } = calcInvoiceTotals(relevantInvoices, today);
  const totalExpenses = calcExpenseTotal(expenseDocs);
  const profit = paid - totalExpenses;

  const summaryLines = [
    `Finanzübersicht – ${businessSettings?.business_name || ''}`,
    ``, `Zeitraum: ${formatDateDE(from)} – ${formatDateDE(to)}`,
    `Erstellt am: ${formatDateDE(new Date())}`,
    ``, `── Einnahmen ──`,
    `Anzahl Rechnungen: ${relevantInvoices.length}`,
    `Bezahlt: ${formatEUR(paid)}`, `Offen: ${formatEUR(open)}`, `Überfällig: ${formatEUR(overdue)}`,
    ``, `── Ausgaben ──`,
    `Anzahl Belege: ${expenseDocs.length}`, `Ausgaben gesamt: ${formatEUR(totalExpenses)}`,
    ``, `── Ergebnis ──`, `Gewinn: ${formatEUR(profit)}`,
    ``, `── Steuerstatus ──`,
    `Steuermodus: ${isSmallBiz ? 'Kleinunternehmerregelung §19 UStG' : 'Umsatzsteuer aktiv'}`,
    ...(isSmallBiz ? [] : [`Netto gesamt: ${formatEUR(totalNet)}`, `Umsatzsteuer gesamt: ${formatEUR(totalTax)}`, `Brutto gesamt: ${formatEUR(totalGross)}`]),
    ...(businessSettings?.tax_number ? [`Steuernummer: ${businessSettings.tax_number}`] : []),
    ...(businessSettings?.vat_id ? [`USt-IdNr: ${businessSettings.vat_id}`] : []),
  ];
  zip.file('zusammenfassung.txt', summaryLines.join('\n'));

  progress(95, 'ZIP erstellen…');
  const blob = await zip.generateAsync({ type: 'blob' });
  progress(100, 'Fertig');
  return blob;
}

/** Full archive export including offers */
export async function generateFullArchiveZip(options: ExportOptions): Promise<Blob> {
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
  const businessInfo = buildBusinessInfo(businessSettings);

  const [{ data: invoices = [] }, { data: offers = [] }, { data: docs = [] }] = await Promise.all([
    supabase.from('invoices').select('*, customer:customers(*)').eq('user_id', userId).gte('date', from).lte('date', to).order('date'),
    supabase.from('offers').select('*, customer:customers(*)').eq('user_id', userId).gte('date', from).lte('date', to).order('date'),
    supabase.from('documents').select('*').eq('user_id', userId).gte('created_at', from).lte('created_at', to + 'T23:59:59').order('created_at'),
  ]);

  const totalDocs = invoices.length + offers.length + docs.length;
  let processedDocs = 0;

  progress(5, 'Rechnungen erstellen…');
  for (const inv of invoices) {
    if (inv.status === 'cancelled') { processedDocs++; continue; }
    await generateInvoicePdf(inv, rechnungenFolder, businessInfo, isSmallBiz);
    processedDocs++;
    progress(5 + (processedDocs / totalDocs) * 50, `${inv.invoice_number}…`);
  }

  progress(40, 'Angebote erstellen…');
  for (const offer of offers) {
    if (offer.status === 'draft') { processedDocs++; continue; }
    await generateOfferPdf(offer, angeboteFolder, businessInfo, isSmallBiz);
    processedDocs++;
    progress(5 + (processedDocs / totalDocs) * 50, `${offer.offer_number}…`);
  }

  progress(65, 'Belege herunterladen…');
  await downloadDocumentFiles(docs, ausgabenFolder, bankFolder, vertraegeFolder, (p, l) => {
    processedDocs++;
    progress(65 + (processedDocs / totalDocs) * 20, l);
  });

  progress(95, 'ZIP erstellen…');
  const blob = await zip.generateAsync({ type: 'blob' });
  progress(100, 'Fertig');
  return blob;
}

// ── HELPERS ──────────────────────────────────────────────────────

function buildBusinessInfo(s: any) {
  return {
    business_name: s?.business_name || '',
    address: formatAddress({ street: s?.street, house_number: s?.house_number, postal_code: s?.postal_code, city: s?.city, country: s?.country, address: s?.address }),
    email: s?.email, phone: s?.phone, tax_number: s?.tax_number, vat_id: s?.vat_id,
    logo_url: s?.logo_url, payment_terms: s?.payment_terms,
    account_holder: s?.account_holder, bank_name: s?.bank_name, iban: s?.iban, bic: s?.bic, owner_name: s?.owner_name,
  };
}

async function generateInvoicePdf(inv: any, folder: JSZip, businessInfo: any, isSmallBiz: boolean) {
  const { data: items = [] } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order');
  const customer = inv.customer as any;
  const customerAddress = customer ? formatAddress({ street: customer.street, house_number: customer.house_number, postal_code: customer.postal_code, city: customer.city, country: customer.country, address: customer.address }) : '';
  try {
    const base64 = await generatePdf({
      type: 'invoice', documentTitle: 'Rechnung', documentNumber: inv.invoice_number,
      date: inv.date, dueDate: inv.due_date, business: businessInfo,
      customer: { name: customer?.name || '', address: customerAddress, email: customer?.email, phone: customer?.phone },
      items: items.map((it: any) => ({ title: it.title, description: it.description, quantity: Number(it.quantity), unit: it.unit, unit_price: Number(it.unit_price), tax_rate: Number(it.tax_rate), total: Number(it.total) })),
      subtotal: Number(inv.subtotal), tax_total: Number(inv.tax_total), grand_total: Number(inv.grand_total),
      intro_text: inv.intro_text || undefined, footer_text: inv.footer_text || undefined,
      closing_text: inv.closing_text || undefined, notes: inv.notes || undefined,
      small_business_regulation: isSmallBiz,
      labels: { date: 'Rechnungsdatum', dueDate: 'Fällig am', quantity: 'Menge', unit: 'Einheit', unitPrice: 'Einzelpreis', taxRate: 'USt %', total: 'Gesamt', subtotal: 'Zwischensumme', taxTotal: 'Umsatzsteuer', grandTotal: 'Gesamtbetrag', description: 'Beschreibung', itemTitle: 'Bezeichnung', page: 'Seite' },
    }, true);
    if (base64 && typeof base64 === 'string') {
      const pdfData = base64.split(',')[1] || base64;
      folder.file(`${inv.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, pdfData, { base64: true });
    }
  } catch (e) { console.error(`PDF failed for ${inv.invoice_number}`, e); }
}

async function generateOfferPdf(offer: any, folder: JSZip, businessInfo: any, isSmallBiz: boolean) {
  const { data: items = [] } = await supabase.from('offer_items').select('*').eq('offer_id', offer.id).order('sort_order');
  const customer = offer.customer as any;
  const customerAddress = customer ? formatAddress({ street: customer.street, house_number: customer.house_number, postal_code: customer.postal_code, city: customer.city, country: customer.country, address: customer.address }) : '';
  try {
    const base64 = await generatePdf({
      type: 'offer', documentTitle: 'Angebot', documentNumber: offer.offer_number, date: offer.date,
      business: businessInfo,
      customer: { name: customer?.name || '', address: customerAddress, email: customer?.email, phone: customer?.phone },
      items: items.map((it: any) => ({ title: it.title, description: it.description, quantity: Number(it.quantity), unit: it.unit, unit_price: Number(it.unit_price), tax_rate: Number(it.tax_rate), total: Number(it.total) })),
      subtotal: Number(offer.subtotal), tax_total: Number(offer.tax_total), grand_total: Number(offer.grand_total),
      intro_text: offer.intro_text || undefined, footer_text: offer.footer_text || undefined,
      closing_text: offer.closing_text || undefined, notes: offer.notes || undefined,
      small_business_regulation: isSmallBiz,
      labels: { date: 'Angebotsdatum', quantity: 'Menge', unit: 'Einheit', unitPrice: 'Einzelpreis', taxRate: 'USt %', total: 'Gesamt', subtotal: 'Zwischensumme', taxTotal: 'Umsatzsteuer', grandTotal: 'Gesamtbetrag', description: 'Beschreibung', itemTitle: 'Bezeichnung', page: 'Seite' },
    }, true);
    if (base64 && typeof base64 === 'string') {
      const pdfData = base64.split(',')[1] || base64;
      folder.file(`${offer.offer_number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, pdfData, { base64: true });
    }
  } catch (e) { console.error(`PDF failed for ${offer.offer_number}`, e); }
}

const EXPENSE_CATS = ['eingangsrechnungen', 'bewirtung', 'fahrtkosten', 'reisekosten', 'miete', 'versicherungen', 'ausgaben'];
const BANK_CATS = ['kontoauszuege', 'kreditkarte', 'paypal_stripe', 'kassenbuch'];
const CONTRACT_CATS = ['mietvertraege', 'darlehensvertraege', 'arbeitsvertraege', 'kooperationsvertraege'];

async function downloadDocumentFiles(docs: any[], ausgaben: JSZip, bank: JSZip, vertraege: JSZip, onFile?: (p: number, l: string) => void) {
  const expenseDocs: any[] = [];
  const incomeDocs: any[] = [];

  for (const d of docs) {
    if (EXPENSE_CATS.includes(d.category)) expenseDocs.push(d);
    else if (['zahlungseingaenge', 'gutschriften'].includes(d.category)) incomeDocs.push(d);

    let targetFolder = ausgaben;
    if (BANK_CATS.includes(d.category)) targetFolder = bank;
    else if (CONTRACT_CATS.includes(d.category)) targetFolder = vertraege;

    try {
      const storagePath = d.file_url.includes('/client-documents/') ? d.file_url.split('/client-documents/').pop() : d.file_url;
      const { data: signedData } = await supabase.storage.from('client-documents').createSignedUrl(storagePath, 600);
      if (signedData?.signedUrl) {
        const resp = await fetch(signedData.signedUrl);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          targetFolder.file(d.file_name.replace(/[^a-zA-Z0-9_.\-]/g, '_'), arrayBuf);
        }
      }
    } catch (e) { console.error(`Failed to download ${d.file_name}`, e); }
    onFile?.(0, `${d.file_name}…`);
  }
  return { expenseDocs, incomeDocs };
}

function relevantInvoicesFrom(invoices: any[]) {
  return invoices.filter((inv: any) => inv.status !== 'cancelled');
}

function calcInvoiceTotals(relevantInvoices: any[], today: string) {
  let totalNet = 0, totalTax = 0, totalGross = 0, paid = 0, open = 0, overdue = 0;
  for (const inv of relevantInvoices) {
    totalNet += Number(inv.subtotal); totalTax += Number(inv.tax_total); totalGross += Number(inv.grand_total);
    if (inv.status === 'paid') paid += Number(inv.grand_total);
    else if (inv.due_date && inv.due_date < today) overdue += Number(inv.grand_total);
    else open += Number(inv.grand_total);
  }
  return { totalNet, totalTax, totalGross, paid, open, overdue };
}

function calcExpenseTotal(expenseDocs: any[]) {
  let total = 0;
  for (const d of expenseDocs) {
    const ext = d.extracted_data as any;
    total += Number(ext?.total_amount) || Number(ext?.net_amount) || 0;
  }
  return total;
}

function generateEinnahmenCsv(zip: JSZip, invoices: any[], incomeDocs: any[], today: string) {
  const header = ['Rechnungsnummer', 'Rechnungsdatum', 'Fälligkeitsdatum', 'Kunde', 'Betrag Netto', 'Umsatzsteuer', 'Betrag Brutto', 'Status', 'Zahlungsdatum'];
  const rows = invoices.map((inv: any) => {
    const customer = inv.customer as any;
    const isOverdue = (inv.status === 'open' || inv.status === 'draft') && inv.due_date && inv.due_date < today;
    let status = 'offen';
    if (inv.status === 'paid') status = 'bezahlt'; else if (isOverdue) status = 'überfällig';
    return [inv.invoice_number, formatDateDE(inv.date), formatDateDE(inv.due_date), customer?.name || '', formatNumber(inv.subtotal), formatNumber(inv.tax_total), formatNumber(inv.grand_total), status, inv.status === 'paid' ? formatDateDE(inv.updated_at) : ''];
  });
  for (const d of incomeDocs) {
    const ext = d.extracted_data as any;
    rows.push(['', formatDateDE(ext?.receipt_date || d.created_at), '', ext?.vendor_name || d.description || d.file_name, formatNumber(Number(ext?.net_amount) || 0), formatNumber(Number(ext?.vat_amount) || 0), formatNumber(Number(ext?.total_amount) || Number(ext?.net_amount) || 0), 'Beleg', '']);
  }
  zip.file('einnahmen_liste.csv', '\uFEFF' + [header, ...rows].map(r => r.join(';')).join('\n'));
}

function generateAusgabenCsv(zip: JSZip, expenseDocs: any[]) {
  const header = ['Datum', 'Kategorie', 'Beschreibung', 'Anbieter', 'Netto', 'Umsatzsteuer', 'Brutto'];
  const rows = expenseDocs.map((d: any) => {
    const ext = d.extracted_data as any;
    return [formatDateDE(ext?.receipt_date || d.created_at), d.category, d.description || d.file_name, ext?.vendor_name || '', formatNumber(Number(ext?.net_amount) || 0), formatNumber(Number(ext?.vat_amount) || 0), formatNumber(Number(ext?.total_amount) || Number(ext?.net_amount) || 0)];
  });
  zip.file('ausgaben_liste.csv', '\uFEFF' + [header, ...rows].map(r => r.join(';')).join('\n'));
}

function generateZusammenfassungCsv(zip: JSZip, invoices: any[], expenseDocs: any[], from: string, to: string, isSmallBiz: boolean, businessSettings: any) {
  const today = new Date().toISOString().split('T')[0];
  const { totalNet, totalTax, totalGross, paid, open, overdue } = calcInvoiceTotals(invoices, today);
  const totalExpenses = calcExpenseTotal(expenseDocs);
  const profit = paid - totalExpenses;
  const header = ['Kennzahl', 'Wert'];
  const rows = [
    ['Zeitraum', `${formatDateDE(from)} – ${formatDateDE(to)}`], ['Erstellt am', formatDateDE(new Date())],
    ['Einnahmen gesamt (bezahlt)', formatEUR(paid)], ['Ausgaben gesamt', formatEUR(totalExpenses)], ['Gewinn', formatEUR(profit)],
    ['Offene Rechnungen', formatEUR(open)], ['Überfällige Rechnungen', formatEUR(overdue)],
    ...(isSmallBiz ? [['Steuermodus', 'Kleinunternehmerregelung §19 UStG']] : [['Netto gesamt', formatEUR(totalNet)], ['Umsatzsteuer gesamt', formatEUR(totalTax)], ['Brutto gesamt', formatEUR(totalGross)]]),
    ...(businessSettings?.tax_number ? [['Steuernummer', businessSettings.tax_number]] : []),
    ...(businessSettings?.vat_id ? [['USt-IdNr', businessSettings.vat_id]] : []),
  ];
  zip.file('zusammenfassung.csv', '\uFEFF' + [header, ...rows].map(r => r.join(';')).join('\n'));
}
