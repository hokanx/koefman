import { formatEUR } from '@/lib/utils';

interface TotalsBlockProps {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  isSmallBusiness: boolean;
  grandTotalLabel?: string;
}

const TotalsBlock = ({ subtotal, taxTotal, grandTotal, isSmallBusiness, grandTotalLabel = 'Gesamtbetrag' }: TotalsBlockProps) => {
  return (
    <div className="mt-4 space-y-1 border-t-2 border-gray-200 pt-3">
      {!isSmallBusiness && (
        <>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Zwischensumme</span>
            <span>{formatEUR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>MwSt.</span>
            <span>{formatEUR(taxTotal)}</span>
          </div>
        </>
      )}
      <div className={`flex justify-between text-base font-bold text-gray-900 ${!isSmallBusiness ? 'pt-1 border-t border-gray-200' : ''}`}>
        <span>{grandTotalLabel}</span>
        <span>{formatEUR(grandTotal)}</span>
      </div>
      {isSmallBusiness && (
        <p className="text-xs text-gray-500 italic">
          Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
        </p>
      )}
    </div>
  );
};

export default TotalsBlock;
