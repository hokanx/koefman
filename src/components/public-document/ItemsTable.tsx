import { formatEUR } from '@/lib/utils';

interface Item {
  id: string;
  title: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate?: number;
  total: number;
}

interface ItemsTableProps {
  items: Item[];
  label?: string;
  isSmallBusiness?: boolean;
}

const fmtQty = (qty: number, unit: string) =>
  `${Number(qty).toFixed(2).replace('.', ',')} ${unit}`;

/* ── Shared cell classes ── */
const thBase = 'pb-2.5 font-medium';
const tdNum  = 'py-3 text-right text-[13px] align-top tabular-nums whitespace-nowrap';

/* ================================================================
   Kleinunternehmer table — 5 columns, no MwSt.
   Pos 8% · Bezeichnung 52% · Menge 12% · Einzelpreis 14% · Gesamt 14%
   ================================================================ */
const SmallBizTable = ({ items }: { items: Item[] }) => (
  <table className="w-full text-sm table-fixed border-collapse">
    <colgroup>
      <col style={{ width: '8%' }} />
      <col style={{ width: '52%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '14%' }} />
    </colgroup>
    <thead>
      <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
        <th className={`${thBase} pr-2 text-left`}>Pos.</th>
        <th className={`${thBase} pr-4 text-left`}>Bezeichnung</th>
        <th className={`${thBase} pr-2 text-right`}>Menge</th>
        <th className={`${thBase} pr-2 text-right`}>Einzelpreis</th>
        <th className={`${thBase} text-right`}>Gesamt</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, i) => (
        <tr key={item.id} className="border-b border-gray-50 last:border-0">
          <td className="py-3 pr-2 text-gray-400 text-[13px] align-top">{i + 1}</td>
          <td className="py-3 pr-4 align-top">
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">{item.title}</p>
            {item.description && (
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{item.description}</p>
            )}
          </td>
          <td className={`${tdNum} pr-2 text-gray-700`}>{fmtQty(item.quantity, item.unit)}</td>
          <td className={`${tdNum} pr-2 text-gray-700`}>{formatEUR(item.unit_price)}</td>
          <td className={`${tdNum} font-bold text-gray-900`}>{formatEUR(item.total)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* ================================================================
   Standard VAT table — 6 columns
   Pos 7% · Bezeichnung 45% · Menge 12% · Einzelpreis 13% · MwSt 9% · Gesamt 14%
   ================================================================ */
const VatTable = ({ items }: { items: Item[] }) => (
  <table className="w-full text-sm table-fixed border-collapse">
    <colgroup>
      <col style={{ width: '7%' }} />
      <col style={{ width: '45%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '14%' }} />
    </colgroup>
    <thead>
      <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
        <th className={`${thBase} pr-2 text-left`}>Pos.</th>
        <th className={`${thBase} pr-4 text-left`}>Bezeichnung</th>
        <th className={`${thBase} pr-2 text-right`}>Menge</th>
        <th className={`${thBase} pr-2 text-right`}>Einzelpreis</th>
        <th className={`${thBase} pr-2 text-right`}>MwSt.</th>
        <th className={`${thBase} text-right`}>Gesamt</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, i) => (
        <tr key={item.id} className="border-b border-gray-50 last:border-0">
          <td className="py-3 pr-2 text-gray-400 text-[13px] align-top">{i + 1}</td>
          <td className="py-3 pr-4 align-top">
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">{item.title}</p>
            {item.description && (
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{item.description}</p>
            )}
          </td>
          <td className={`${tdNum} pr-2 text-gray-700`}>{fmtQty(item.quantity, item.unit)}</td>
          <td className={`${tdNum} pr-2 text-gray-700`}>{formatEUR(item.unit_price)}</td>
          <td className={`${tdNum} pr-2 text-gray-500`}>{item.tax_rate != null ? `${item.tax_rate} %` : '–'}</td>
          <td className={`${tdNum} font-bold text-gray-900`}>{formatEUR(item.total)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/* ================================================================
   Mobile cards (shared for both modes)
   ================================================================ */
const MobileCards = ({ items }: { items: Item[] }) => (
  <div className="sm:hidden space-y-2">
    {items.map((item, i) => (
      <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/40 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-gray-900">{i + 1}. {item.title}</p>
            {item.description && (
              <p className="text-[11px] text-gray-400 mt-1">{item.description}</p>
            )}
          </div>
          <p className="text-[13px] font-semibold text-gray-900 shrink-0">{formatEUR(item.total)}</p>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          {fmtQty(item.quantity, item.unit)} × {formatEUR(item.unit_price)}
        </p>
      </div>
    ))}
  </div>
);

/* ================================================================
   Main component
   ================================================================ */
const ItemsTable = ({ items, label = 'Positionen', isSmallBusiness = false }: ItemsTableProps) => {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">
        {label}
      </p>

      {/* Desktop */}
      <div className="hidden sm:block">
        {isSmallBusiness ? <SmallBizTable items={items} /> : <VatTable items={items} />}
      </div>

      {/* Mobile */}
      <MobileCards items={items} />
    </div>
  );
};

export default ItemsTable;
