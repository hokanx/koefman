import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, FileText, Receipt } from 'lucide-react';

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profiles, settings, offers, invoices] = await Promise.all([
        supabase.from('profiles').select('id, account_status', { count: 'exact', head: false }),
        supabase.from('business_settings').select('id', { count: 'exact', head: true }),
        supabase.from('offers').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
      ]);

      const pending = profiles.data?.filter(p => p.account_status === 'pending').length ?? 0;
      const active = profiles.data?.filter(p => p.account_status === 'active').length ?? 0;

      return {
        totalUsers: profiles.count ?? 0,
        pendingUsers: pending,
        activeUsers: active,
        totalWorkspaces: settings.count ?? 0,
        totalOffers: offers.count ?? 0,
        totalInvoices: invoices.count ?? 0,
      };
    },
  });

  const cards = [
    { label: 'Benutzer gesamt', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-primary' },
    { label: 'Wartend', value: stats?.pendingUsers ?? 0, icon: Users, color: 'text-warning' },
    { label: 'Aktiv', value: stats?.activeUsers ?? 0, icon: Users, color: 'text-success' },
    { label: 'Firmen', value: stats?.totalWorkspaces ?? 0, icon: Building2, color: 'text-info' },
    { label: 'Angebote', value: stats?.totalOffers ?? 0, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Rechnungen', value: stats?.totalInvoices ?? 0, icon: Receipt, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Übersicht</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
