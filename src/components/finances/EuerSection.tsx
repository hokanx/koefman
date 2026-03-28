import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { formatEUR } from '@/lib/utils';

interface EuerSectionProps {
  income: number;
  expenses: number;
}

const EuerSection = ({ income, expenses }: EuerSectionProps) => {
  const profit = income - expenses;
  const isPositive = profit >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-semibold text-foreground">Einnahmen & Ausgaben</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">Einnahmen</span>
          </div>
          <span className="font-medium text-success">{formatEUR(income)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Ausgaben</span>
          </div>
          <span className="font-medium text-destructive">{formatEUR(expenses)}</span>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Gewinn</span>
            </div>
            <span className={`text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {formatEUR(profit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EuerSection;
