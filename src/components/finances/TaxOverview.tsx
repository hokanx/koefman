import { Info } from 'lucide-react';
import { formatEUR } from '@/lib/utils';

interface TaxOverviewProps {
  isSmallBiz: boolean;
  totalNet: number;
  totalTax: number;
  totalGross: number;
  countAll: number;
  countOpen: number;
  countOverdue: number;
}

const Row = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
  <div className={`flex justify-between rounded-lg p-3 ${highlight ? 'bg-warning/10' : 'bg-muted/30'}`}>
    <span className={highlight ? 'text-warning' : 'text-muted-foreground'}>{label}</span>
    <span className={`font-medium ${highlight ? 'text-warning' : 'text-foreground'}`}>{value}</span>
  </div>
);

const TaxOverview = ({ isSmallBiz, totalNet, totalTax, totalGross, countAll, countOpen, countOverdue }: TaxOverviewProps) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <h2 className="mb-3 font-semibold text-foreground">Steuerübersicht</h2>
    <div className="space-y-2 text-sm">
      <Row label="Anzahl Rechnungen" value={countAll} />
      {!isSmallBiz && (
        <>
          <Row label="Netto gesamt" value={formatEUR(totalNet)} />
          <Row label="Umsatzsteuer gesamt" value={formatEUR(totalTax)} />
        </>
      )}
      <Row label="Brutto gesamt" value={formatEUR(totalGross)} />
      <Row label="Offene Rechnungen" value={countOpen} />
      {countOverdue > 0 && <Row label="Überfällige Rechnungen" value={countOverdue} highlight />}
    </div>
    {isSmallBiz && (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Hinweis: Es wird keine Umsatzsteuer berechnet (§19 UStG).</span>
      </div>
    )}
  </div>
);

export default TaxOverview;
