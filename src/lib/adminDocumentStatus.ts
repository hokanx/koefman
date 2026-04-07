// Shared status configuration for admin document views

export const ADMIN_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-900/50 text-blue-400 border-blue-800',
  accepted: 'bg-green-900/50 text-green-400 border-green-800',
  rejected: 'bg-red-900/50 text-red-400 border-red-800',
  open: 'bg-blue-900/50 text-blue-400 border-blue-800',
  paid: 'bg-green-900/50 text-green-400 border-green-800',
  overdue: 'bg-red-900/50 text-red-400 border-red-800',
  cancelled: 'bg-muted text-muted-foreground',
  entwurf: 'bg-muted text-muted-foreground',
  gesendet: 'bg-blue-900/50 text-blue-400 border-blue-800',
  aktiv: 'bg-green-900/50 text-green-400 border-green-800',
  unterzeichnet: 'bg-green-900/50 text-green-400 border-green-800',
  pausiert: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
  beendet: 'bg-muted text-muted-foreground',
};

export const ADMIN_STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  open: 'Offen',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  aktiv: 'Aktiv',
  unterzeichnet: 'Unterzeichnet',
  pausiert: 'Pausiert',
  beendet: 'Beendet',
};

export const getStatusLabel = (status: string): string =>
  ADMIN_STATUS_LABELS[status] || status;

export const getStatusColor = (status: string): string =>
  ADMIN_STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
