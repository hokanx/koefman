import { formatEUR } from '@/lib/utils';

interface Item {
  id: string;
  title: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface ItemsTableProps {
  items: Item[];
  label?: string;
}

const ItemsTable = ({ items, label = 'Positionen' }: ItemsTableProps) => {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">
        {label}
      </p>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[36px]" />
            <col />
            <col className="w-[60px]" />
            <col className="w-[52px]" />
            <col className="w-[96px]" />
            <col className="w-[96px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-400">
              <th className="pb-2.5 pr-2 text-left font-medium">Pos.</th>
              <th className="pb-2.5 pr-6 text-left font-medium">Bezeichnung</th>
              <th className="pb-2.5 pr-1 text-right font-medium">Menge</th>
              <th className="pb-2.5 pr-1 text-center font-medium">Einheit</th>
              <th className="pb-2.5 pr-1 text-right font-medium">Einzelpreis</th>
              <th className="pb-2.5 text-right font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0">
                <td className="py-3 pr-2 text-gray-400 text-[13px] align-top">{i + 1}</td>
                <td className="py-3 pr-6 align-top">
                  <p className="text-[13px] font-semibold text-gray-900 leading-snug">{item.title}</p>
                  {item.description && (
                    <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{item.description}</p>
                  )}
                </td>
                <td className="py-3 pr-1 text-right text-[13px] text-gray-700 align-top tabular-nums">
                  {Number(item.quantity).toFixed(2).replace('.', ',')}
                </td>
                <td className="py-3 pr-1 text-center text-[13px] text-gray-500 align-top">{item.unit}</td>
                <td className="py-3 pr-1 text-right text-[13px] text-gray-700 align-top tabular-nums">
                  {formatEUR(item.unit_price)}
                </td>
                <td className="py-3 text-right text-[13px] font-bold text-gray-900 align-top tabular-nums">
                  {formatEUR(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
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
              {Number(item.quantity).toFixed(2).replace('.', ',')} {item.unit} × {formatEUR(item.unit_price)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsTable;
