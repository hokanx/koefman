interface DocumentHeaderProps {
  businessName?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  logoUrl?: string;
}

const DocumentHeader = ({ businessName, street, houseNumber, postalCode, city, logoUrl }: DocumentHeaderProps) => {
  const addressLine = [
    street && houseNumber ? `${street} ${houseNumber}` : street,
    postalCode && city ? `${postalCode} ${city}` : city,
  ].filter(Boolean).join(', ');

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {businessName || 'Unternehmen'}
          </h1>
          {addressLine && (
            <p className="mt-1 text-sm text-gray-500">{addressLine}</p>
          )}
        </div>
        {logoUrl && (
          <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
        )}
      </div>
    </div>
  );
};

export default DocumentHeader;
