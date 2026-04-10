interface BankDetailsProps {
  accountHolder?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
  referenceNumber?: string;
}

const BankDetails = ({ accountHolder, bankName, iban, bic, referenceNumber }: BankDetailsProps) => {
  if (!iban) return null;

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/60 px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-2.5">
        Bankverbindung
      </p>
      <div className="space-y-1 text-[13px]">
        {accountHolder && <p className="text-gray-900 font-medium">{accountHolder}</p>}
        {bankName && <p className="text-gray-500">{bankName}</p>}
        <p className="text-gray-900 font-mono text-[12px] tracking-wide">{iban}</p>
        {bic && <p className="text-gray-500 text-[12px]">BIC: {bic}</p>}
        {referenceNumber && (
          <p className="text-gray-400 text-[12px] mt-2">Verwendungszweck: {referenceNumber}</p>
        )}
      </div>
    </div>
  );
};

export default BankDetails;
