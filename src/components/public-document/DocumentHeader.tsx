interface DocumentHeaderProps {
  businessName?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  vatId?: string;
  /** Compact single-line sender above the recipient */
  recipientName?: string;
  recipientAddress?: string;
}

const DocumentHeader = ({
  businessName,
  street,
  houseNumber,
  postalCode,
  city,
  logoUrl,
  email,
  phone,
  taxNumber,
  vatId,
  recipientName,
  recipientAddress,
}: DocumentHeaderProps) => {
  const addressLine = [
    street && houseNumber ? `${street} ${houseNumber}` : street,
    postalCode && city ? `${postalCode} ${city}` : city,
  ].filter(Boolean).join(', ');

  const senderLine = [businessName, addressLine].filter(Boolean).join(' · ');

  const contactDetails = [phone, email].filter(Boolean);
  const taxDetails = [
    taxNumber ? `St.-Nr.: ${taxNumber}` : '',
    vatId ? `USt-IdNr.: ${vatId}` : '',
  ].filter(Boolean);

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Top bar: logo left, company info right */}
      <div className="flex items-start justify-between gap-6 px-7 pt-7 pb-5">
        {/* Logo */}
        <div className="shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-14 w-auto object-contain"
            />
          ) : (
            <div className="flex h-14 items-center">
              <span className="text-xl font-bold tracking-tight text-gray-900">
                {businessName || 'Unternehmen'}
              </span>
            </div>
          )}
        </div>

        {/* Company block */}
        <div className="text-right text-[13px] leading-relaxed text-gray-600 min-w-0">
          {logoUrl && businessName && (
            <p className="font-semibold text-gray-900">{businessName}</p>
          )}
          {addressLine && <p>{addressLine}</p>}
          {contactDetails.map((d, i) => (
            <p key={i}>{d}</p>
          ))}
          {taxDetails.length > 0 && (
            <p className="text-gray-400 text-[11px] mt-1">{taxDetails.join(' · ')}</p>
          )}
        </div>
      </div>

      {/* Sender line + recipient */}
      {recipientName && (
        <div className="border-t border-gray-100 px-7 py-5">
          <p className="text-[10px] tracking-[0.06em] uppercase text-gray-400 mb-2">
            {senderLine}
          </p>
          <p className="text-[15px] font-semibold text-gray-900">{recipientName}</p>
          {recipientAddress && (
            <p className="text-[13px] text-gray-600 whitespace-pre-line leading-relaxed">{recipientAddress}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentHeader;
