import { formatDateDE } from '@/lib/utils';

interface DocumentMetaProps {
  documentNumber: string;
  date: string;
  title: string;
  serviceTypeLabel?: string;
  customerName?: string;
  children?: React.ReactNode;
}

const DocumentMeta = ({ documentNumber, date, title, serviceTypeLabel, customerName, children }: DocumentMetaProps) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{documentNumber}</span>
        <span className="text-sm text-gray-500">{formatDateDE(date)}</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {serviceTypeLabel && (
        <p className="mt-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
          Leistungsart: {serviceTypeLabel}
        </p>
      )}
      {customerName && (
        <p className="mt-1 text-sm text-gray-600">Für: {customerName}</p>
      )}
      {children}
    </div>
  );
};

export default DocumentMeta;
