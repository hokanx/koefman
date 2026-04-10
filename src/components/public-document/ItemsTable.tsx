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
}

const ItemsTable = ({ items }: ItemsTableProps) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-2 font-medium">Pos.</th>
              <th className="pb-2 pr-2 font-medium">Bezeichnung</th>
              <th className="pb-2 pr-2 text-right font-medium">Menge</th>
              <th className="pb-2 pr-2 font-medium">Einheit</th>
              <th className="pb-2 pr-2 text-right font-medium">Einzelpreis</th>
              <th className="pb-2 text-right font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-2">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  {item.description && <p className="text-gray-500 text-xs">{item.description}</p>}
                </td>
                <td className="py-2 pr-2 text-right text-gray-700">{Number(item.quantity).toFixed(2).replace('.', ',')}</td>
                <td className="py-2 pr-2 text-gray-700">{item.unit}</td>
                <td className="py-2 pr-2 text-right text-gray-700">{formatEUR(item.unit_price)}</td>
                <td className="py-2 text-right font-medium text-gray-900">{formatEUR(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{i + 1}. {item.title}</p>
                {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
              </div>
              <p className="font-semibold text-gray-900 shrink-0">{formatEUR(item.total)}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">{Number(item.quantity).toFixed(2).replace('.', ',')} {item.unit} × {formatEUR(item.unit_price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsTable;
