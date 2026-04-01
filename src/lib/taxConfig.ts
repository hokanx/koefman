/**
 * Single source of truth for tax mode logic.
 * All document calculations, PDFs, and UI must use this.
 */

export interface TaxConfig {
  vatEnabled: boolean;
  vatRate: number;
  legalNote: string | null;
}

export type TaxMode = 'standard' | 'kleinunternehmer';

const KLEINUNTERNEHMER_NOTE = 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.';

export function getTaxConfig(taxMode: TaxMode | string | undefined): TaxConfig {
  if (taxMode === 'kleinunternehmer') {
    return {
      vatEnabled: false,
      vatRate: 0,
      legalNote: KLEINUNTERNEHMER_NOTE,
    };
  }
  return {
    vatEnabled: true,
    vatRate: 19,
    legalNote: null,
  };
}

/**
 * Calculate document totals based on tax mode.
 * When kleinunternehmer, tax is always 0 regardless of item tax_rate.
 */
export function calculateTotals(
  items: { total: number; tax_rate: number }[],
  taxMode: TaxMode | string | undefined
) {
  const config = getTaxConfig(taxMode);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxTotal = config.vatEnabled
    ? items.reduce((sum, item) => sum + (item.total * item.tax_rate) / 100, 0)
    : 0;
  const grandTotal = subtotal + taxTotal;

  return { subtotal, taxTotal, grandTotal };
}
