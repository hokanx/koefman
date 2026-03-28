import { Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { formatEUR } from '@/lib/utils';

interface FinanceCardsProps {
  totalGross: number;
  paid: number;
  open: number;
  overdue: number;
  labels: {
    totalRevenue: string;
    paid: string;
    openAmount: string;
    overdueAmount: string;
  };
}

const FinanceCards = ({ totalGross, paid, open, overdue, labels }: FinanceCardsProps) => (
  <div className="grid grid-cols-2 gap-3">
    <StatCard title={labels.totalRevenue} value={formatEUR(totalGross)} icon={Receipt} />
    <StatCard title={labels.paid} value={formatEUR(paid)} icon={CheckCircle} variant="success" />
    <StatCard title={labels.openAmount} value={formatEUR(open)} icon={Clock} variant="warning" />
    <StatCard title={labels.overdueAmount} value={formatEUR(overdue)} icon={AlertTriangle} variant="destructive" />
  </div>
);

export default FinanceCards;
