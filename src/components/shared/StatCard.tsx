import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const variantClasses = {
  default: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

const StatCard = ({ title, value, icon: Icon, variant = 'default' }: StatCardProps) => {
  return (
    <div className="card-hover rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className={`h-5 w-5 ${variantClasses[variant]}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${variantClasses[variant]}`}>{value}</p>
    </div>
  );
};

export default StatCard;
