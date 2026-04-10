import { formatDateDE } from '@/lib/utils';

interface MetaField {
  label: string;
  value: string;
  highlight?: boolean;
}

interface DocumentMetaProps {
  title: string;
  fields: MetaField[];
  serviceTypeLabel?: string;
  children?: React.ReactNode;
}

const DocumentMeta = ({ title, fields, serviceTypeLabel, children }: DocumentMetaProps) => {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">{title}</h2>
        {serviceTypeLabel && (
          <p className="mt-0.5 text-[11px] font-medium text-gray-400 uppercase tracking-[0.08em]">
            Leistungsart: {serviceTypeLabel}
          </p>
        )}
      </div>

      {/* Meta row */}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-b border-gray-100 py-3">
          {fields.map((field, i) => (
            <div key={i} className="min-w-[120px]">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-gray-400">
                {field.label}
              </p>
              <p className={`text-[13px] mt-0.5 ${field.highlight ? 'font-semibold text-red-600' : 'font-medium text-gray-900'}`}>
                {field.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
};

export default DocumentMeta;
export type { MetaField };
