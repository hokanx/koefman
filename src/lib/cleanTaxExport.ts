import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { generatePdf } from '@/lib/generatePdf';
import { formatAddress } from '@/types';
import { formatDateDE } from '@/lib/utils';

export interface CleanExportOptions {
  userId: string;
  from: string;
  to: string;
  businessSettings: any;
  isKleinunternehmer?: boolean;
  onProgress?: (percent: number, label: string) => void;
}

export interface TaxExportSummary {
  paidInvoices: any[];
  validExpenses: any[];
  totalIncome: number;
  totalExpenses: number;
  totalTax: number;
  profit: number;
  isReady: boolean;
  warnings: string[];
}

/** Fetch and compute summary for the tax export screen */
export async function fetchTaxExportSummary(
  userId: string,
  from: string,
  to: string
): Promise<TaxExportSummary> {
  const [{ data: invoices = [] }, { data: docs = [] }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, subtotal, tax_total, grand_total, date, updated_at, customer_id')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .gte('updated_at', from)
      .lte('updated_at', to + 'T23:59:59'),
    supabase
      .from('documents')
      .select('id, file_name, category, status, extracted_data, created_at')
      .eq('user_id', userId)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .in('status', ['geprueft', 'verarbeitet']),
  ]);

  // Filter expenses: only those with a positive gross amount from extracted_data
  const validExpenses = docs.filter((d) => {
    const ext = d.extracted_data as any;
    const gross = Number(ext?.total_amount) || Number(ext?.net_amount) || 0;
    return gross > 0;
  });

  const totalIncome = invoices.reduce((s, inv) => s + Number(inv.grand_total), 0);
  const totalTax = invoices.reduce((s, inv) => s + Number(inv.tax_total), 0);
  const totalExpenses = validExpenses.reduce((s, d) => {
    const ext = d.extracted_data as any;
    return s + (Number(ext?.total_amount) || Number(ext?.net_amount) || 0);
  }, 0);

  const warnings: string[] = [];
  if (invoices.length === 0 && validExpenses.length === 0) {
    warnings.push('Keine Daten im gewählten Zeitraum vorhanden.');
  }

  return {
    paidInvoices: invoices,
    validExpenses,
    totalIncome,
    totalExpenses,
    totalTax,
    profit: totalIncome - totalExpenses,
    isReady: warnings.length === 0,
    warnings,
  };
}

/** Generate clean tax export ZIP */
export async function generateCleanTaxExportZip(options: CleanExportOptions): Promise<Blob> {
  const { userId, from, to, businessSettings, onProgress } = options;
  const zip = new JSZip();

  const monthLabel = buildMonthLabel(from);
  const rootFolder = zip.folder(`steuer-export-${monthLabel}`)!;
  const rechnungenFolder = rootFolder.folder('rechnungen')!;
  const ausgabenFolder = rootFolder.folder('ausgaben')!;

  const progress = (p: number, l: string) => onProgress?.(Math.round(p), l);
  progress(0, 'Daten laden…');

  const isSmallBiz = !!businessSettings?.small_business_regulation;
  const businessInfo = buildBusinessInfo(businessSettings);

  // ── 1. FETCH paid invoices + valid expenses ──
  const [{ data: invoices = [] }, { data: docs = [] }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('user_id', userId)
      .eq('status', 'paid')
      .gte('updated_at', from)
      .lte('updated_at', to + 'T23:59:59')
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

  const validExpenses = docs.filter((d) => {
    const ext = d.extracted_data as any;
    return (Number(ext?.total_amount) || Number(ext?.net_amount) || 0) > 0;
  });

  const totalItems = invoices.length + validExpenses.length;
  let processed = 0;

  // ── 2. Generate invoice PDFs ──
  progress(5, 'Rechnungen erstellen…');
  for (const inv of invoices) {
    await generateInvoicePdf(inv, rechnungenFolder, businessInfo, isSmallBiz);
    processed++;
    progress(5 + (processed / Math.max(totalItems, 1)) * 60, `${inv.invoice_number}…`);
  }

  // ── 3. Download expense receipt files ──
  progress(70, 'Belege herunterladen…');
  for (const d of validExpenses) {
    try {
      const storagePath = d.file_url.includes('/client-documents/')
        ? d.file_url.split('/client-documents/').pop()
        : d.file_url;
      const { data: signedData } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(storagePath!, 600);
      if (signedData?.signedUrl) {
        const resp = await fetch(signedData.signedUrl);
        if (resp.ok) {
          const buf = await resp.arrayBuffer();
          ausgabenFolder.file(d.file_name.replace(/[^a-zA-Z0-9_.\-]/g, '_'), buf);
        }
      }
    } catch (e) {
      console.error(`Failed to download ${d.file_name}`, e);
    }
    processed++;
    progress(70 + (processed / Math.max(totalItems, 1)) * 20, `${d.file_name}…`);
  }

  // ── 4. Generate zusammenfassung.csv ──
  progress(92, 'Zusammenfassung erstellen…');
  const csvRows = buildZusammenfassungRows(invoices, validExpenses);
  rootFolder.file('zusammenfassung.csv', '\uFEFF' + csvRows);

  // ── 5. Finalize ──
  progress(96, 'ZIP erstellen…');
  const blob = await zip.generateAsync({ type: 'blob' });
  progress(100, 'Fertig');
  return blob;
}

// ── HELPERS ──

function buildMonthLabel(from: string): string {
  const d = new Date(from);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

function buildBusinessInfo(s: any) {
  return {
    business_name: s?.business_name || '',
    address: formatAddress({
      street: s?.street, house_number: s?.house_number,
      postal_code: s?.postal_code, city: s?.city,
      country: s?.country, address: s?.address,
    }),
    email: s?.email, phone: s?.phone,
    tax_number: s?.tax_number, vat_id: s?.vat_id,
    logo_url: s?.logo_url, payment_terms: s?.payment_terms,
    account_holder: s?.account_holder, bank_name: s?.bank_name,
    iban: s?.iban, bic: s?.bic, owner_name: s?.owner_name,
  };
}

async function generateInvoicePdf(inv: any, folder: JSZip, businessInfo: any, isSmallBiz: boolean) {
  const { data: items = [] } = await supabase
    .from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order');
  const customer = inv.customer as any;
  const customerAddress = customer
    ? formatAddress({
        street: customer.street, house_number: customer.house_number,
        postal_code: customer.postal_code, city: customer.city,
        country: customer.country, address: customer.address,
      })
    : '';
  try {
    const base64 = await generatePdf({
      type: 'invoice', documentTitle: 'Rechnung',
      documentNumber: inv.invoice_number, date: inv.date, dueDate: inv.due_date,
      business: businessInfo,
      customer: { name: customer?.name || '', address: customerAddress, email: customer?.email, phone: customer?.phone },
      items: items.map((it: any) => ({
        title: it.title, description: it.description,
        quantity: Number(it.quantity), unit: it.unit,
        unit_price: Number(it.unit_price), tax_rate: Number(it.tax_rate),
        total: Number(it.total),
      })),
      subtotal: Number(inv.subtotal), tax_total: Number(inv.tax_total),
      grand_total: Number(inv.grand_total),
      intro_text: inv.intro_text || undefined, footer_text: inv.footer_text || undefined,
      closing_text: inv.closing_text || undefined, notes: inv.notes || undefined,
      small_business_regulation: isSmallBiz,
      labels: {
        date: 'Rechnungsdatum', dueDate: 'Fällig am',
        quantity: 'Menge', unit: 'Einheit', unitPrice: 'Einzelpreis',
        taxRate: 'USt %', total: 'Gesamt', subtotal: 'Zwischensumme',
        taxTotal: 'Umsatzsteuer', grandTotal: 'Gesamtbetrag',
        description: 'Beschreibung', itemTitle: 'Bezeichnung', page: 'Seite',
      },
    }, true);
    if (base64 && typeof base64 === 'string') {
      const pdfData = base64.split(',')[1] || base64;
      folder.file(`${inv.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`, pdfData, { base64: true });
    }
  } catch (e) {
    console.error(`PDF failed for ${inv.invoice_number}`, e);
  }
}

function fmtNum(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

function fmtDate(d: string | Date): string {
  return formatDateDE(d);
}

function buildZusammenfassungRows(invoices: any[], expenses: any[]): string {
  const header = ['Datum', 'Typ', 'Name', 'Betrag Netto', 'USt', 'Betrag Brutto', 'Kategorie', 'Dokumentnummer'];

  const rows: string[][] = [];

  // Deduplicate by id
  const seenIds = new Set<string>();

  for (const inv of invoices) {
    if (seenIds.has(inv.id)) continue;
    seenIds.add(inv.id);
    const customer = inv.customer as any;
    rows.push([
      fmtDate(inv.date),
      'Einnahme',
      customer?.name || '',
      fmtNum(Number(inv.subtotal)),
      fmtNum(Number(inv.tax_total)),
      fmtNum(Number(inv.grand_total)),
      'Rechnung',
      inv.invoice_number,
    ]);
  }

  for (const d of expenses) {
    if (seenIds.has(d.id)) continue;
    seenIds.add(d.id);
    const ext = d.extracted_data as any;
    const net = Number(ext?.net_amount) || 0;
    const vat = Number(ext?.vat_amount) || 0;
    const gross = Number(ext?.total_amount) || net;
    rows.push([
      fmtDate(ext?.receipt_date || d.created_at),
      'Ausgabe',
      ext?.vendor_name || d.description || d.file_name,
      fmtNum(net),
      fmtNum(vat),
      fmtNum(gross),
      d.category || '',
      '',
    ]);
  }

  return [header, ...rows].map((r) => r.join(';')).join('\n');
}
