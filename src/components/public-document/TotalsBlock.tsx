import { formatEUR } from '@/lib/utils';

interface TotalsBlockProps {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  isSmallBusiness: boolean;
  grandTotalLabel?: string;
}

const TotalsBlock = ({
  subtotal,
  taxTotal,
  grandTotal,
  isSmallBusiness,
  grandTotalLabel = 'Gesamtbetrag',
}: TotalsBlockProps) => {
  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <div className="ml-auto max-w-[280px] space-y-1.5">
        {!isSmallBusiness && (
          <>
            <div className="flex justify-between text-[13px] text-gray-500">
              <span>Zwischensumme</span>
              <span>{formatEUR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-gray-500">
              <span>MwSt.</span>
              <span>{formatEUR(taxTotal)}</span>
            </div>
            <div className="border-t border-gray-200 my-1" />
          </>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] font-semibold text-gray-900">{grandTotalLabel}</span>
          <span className="text-lg font-bold text-gray-900">{formatEUR(grandTotal)}</span>
        </div>
        {isSmallBusiness && (
          <p className="text-[11px] text-gray-400 italic pt-1">
            Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
          </p>
        )}
      </div>
    </div>
  );
};

export default TotalsBlock;
