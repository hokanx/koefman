// Normalize extracted data fields from AI analysis to a consistent shape
// AI returns: vendor_name, receipt_date, total_amount, net_amount, vat_amount
// UI expects: vendor, date, net_amount, vat_amount, gross_amount

export interface NormalizedExtracted {
  vendor?: string;
  date?: string;
  net_amount?: number;
  vat_amount?: number;
  gross_amount?: number;
  suggested_category?: string;
  confidence?: string;
  notes?: string;
  description?: string;
}

/** Raw shape returned by the AI document analysis step (field names are not fully standardized). */
export interface RawExtractedData {
  vendor?: string | null;
  vendor_name?: string | null;
  date?: string | null;
  receipt_date?: string | null;
  net_amount?: number | string | null;
  vat_amount?: number | string | null;
  gross_amount?: number | string | null;
  total_amount?: number | string | null;
  suggested_category?: string | null;
  confidence?: string | null;
  notes?: string | null;
  description?: string | null;
}

export function normalizeExtracted(raw: RawExtractedData | null | undefined): NormalizedExtracted {
  if (!raw) return {};

  const vendor = raw.vendor || raw.vendor_name || undefined;
  const date = raw.date || raw.receipt_date || undefined;
  const net = raw.net_amount != null && Number(raw.net_amount) > 0 ? Number(raw.net_amount) : undefined;
  const vat = raw.vat_amount != null && Number(raw.vat_amount) > 0 ? Number(raw.vat_amount) : undefined;

  // gross_amount or total_amount
  let gross = raw.gross_amount != null ? Number(raw.gross_amount) :
              raw.total_amount != null ? Number(raw.total_amount) : undefined;

  // Auto-calculate brutto if missing but netto + ust exist
  if (gross == null && net != null && vat != null) {
    gross = +(net + vat).toFixed(2);
  }

  return {
    vendor,
    date,
    net_amount: net,
    vat_amount: vat,
    gross_amount: gross,
    suggested_category: raw.suggested_category || undefined,
    confidence: raw.confidence || undefined,
    notes: raw.notes || undefined,
    description: raw.description || undefined,
  };
}

export function formatAmountDE(n: number | undefined): string {
  if (n == null) return '–';
  return n.toFixed(2).replace('.', ',') + ' €';
}

/** Check if extracted data is incomplete (missing key fields) */
export function isAnalysisIncomplete(raw: RawExtractedData | null | undefined): boolean {
  if (!raw) return true;
  const norm = normalizeExtracted(raw);
  // Missing vendor OR missing any amount
  return !norm.vendor || norm.gross_amount == null;
}
