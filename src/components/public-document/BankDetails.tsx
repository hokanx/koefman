

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
    <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-1 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Bankverbindung</p>
      {accountHolder && <p className="text-foreground">{accountHolder}</p>}
      {bankName && <p className="text-muted-foreground">{bankName}</p>}
      <p className="text-foreground font-mono text-xs">{iban}</p>
      {bic && <p className="text-muted-foreground text-xs">BIC: {bic}</p>}
      {referenceNumber && (
        <p className="text-muted-foreground text-xs mt-2">Verwendungszweck: {referenceNumber}</p>
      )}
    </div>
  );
};

export default BankDetails;
