import { cn } from '@/lib/utils';

type StatusVariant = 'draft' | 'sent' | 'accepted' | 'rejected' | 'open' | 'paid' | 'overdue' | 'cancelled';

const variants: Record<StatusVariant, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-info/15 text-info',
  accepted: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
  open: 'bg-info/15 text-info',
  paid: 'bg-success/15 text-success',
  overdue: 'bg-warning/15 text-warning',
  cancelled: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
}

const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', variants[status])}>
      {label}
    </span>
  );
};

export default StatusBadge;
