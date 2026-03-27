import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, FileText, Receipt, FolderOpen, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profiles, settings, offers, invoices, documents] = await Promise.all([
        supabase.from('profiles').select('id, account_status', { count: 'exact', head: false }),
        supabase.from('business_settings').select('id', { count: 'exact', head: true }),
        supabase.from('offers').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id, status'),
      ]);

      const pending = profiles.data?.filter(p => p.account_status === 'pending').length ?? 0;
      const active = profiles.data?.filter(p => p.account_status === 'active').length ?? 0;
      const newDocs = documents.data?.filter(d => d.status === 'neu').length ?? 0;
      const totalDocs = documents.data?.length ?? 0;

      return {
        totalUsers: profiles.count ?? 0,
        pendingUsers: pending,
        activeUsers: active,
        totalWorkspaces: settings.count ?? 0,
        totalOffers: offers.count ?? 0,
        totalInvoices: invoices.count ?? 0,
        totalDocs,
        newDocs,
      };
    },
  });

  const cards = [
    { label: 'Benutzer gesamt', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-primary', to: '/admin/users' },
    { label: 'Wartend auf Freischaltung', value: stats?.pendingUsers ?? 0, icon: Users, color: 'text-warning', to: '/admin/users', highlight: true },
    { label: 'Aktive Benutzer', value: stats?.activeUsers ?? 0, icon: Users, color: 'text-success', to: '/admin/users' },
    { label: 'Neue Belege', value: stats?.newDocs ?? 0, icon: FolderOpen, color: 'text-primary', to: '/admin/documents', highlight: true },
    { label: 'Belege gesamt', value: stats?.totalDocs ?? 0, icon: FolderOpen, color: 'text-muted-foreground', to: '/admin/documents' },
    { label: 'Firmen', value: stats?.totalWorkspaces ?? 0, icon: Building2, color: 'text-info', to: '/admin/workspaces' },
    { label: 'Angebote', value: stats?.totalOffers ?? 0, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Rechnungen', value: stats?.totalInvoices ?? 0, icon: Receipt, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Übersicht</h2>

      {/* Urgent actions */}
      {((stats?.pendingUsers ?? 0) > 0 || (stats?.newDocs ?? 0) > 0) && (
        <div className="space-y-2">
          {(stats?.pendingUsers ?? 0) > 0 && (
            <button
              onClick={() => navigate('/admin/users')}
              className="flex w-full items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-4 transition-colors hover:bg-warning/10"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium text-foreground">
                  {stats!.pendingUsers} Benutzer warten auf Freischaltung
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-warning" />
            </button>
          )}
          {(stats?.newDocs ?? 0) > 0 && (
            <button
              onClick={() => navigate('/admin/documents')}
              className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {stats!.newDocs} neue Belege zur Prüfung
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const content = (
            <div key={c.label} className={`rounded-xl border border-border bg-card p-4 ${c.to ? 'transition-colors hover:border-primary/30 cursor-pointer' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <c.icon className={`h-4 w-4 ${c.color}`} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          );
          return c.to ? (
            <button key={c.label} onClick={() => navigate(c.to!)} className="text-left">
              {content}
            </button>
          ) : (
            <div key={c.label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;
