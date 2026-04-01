import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Inbox, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const [leads, offers, invoices, contracts] = await Promise.all([
        supabase.from('diagnostic_submissions').select('id, lead_status', { count: 'exact' }),
        supabase.from('offers').select('id, status', { count: 'exact' }),
        supabase.from('invoices').select('id, status', { count: 'exact' }),
        supabase.from('contracts').select('id, status', { count: 'exact' }),
      ]);

      const newLeads = leads.data?.filter(l => l.lead_status === 'neu').length ?? 0;
      const openOffers = offers.data?.filter(o => o.status === 'sent').length ?? 0;
      const openInvoices = invoices.data?.filter(i => i.status === 'open').length ?? 0;

      return {
        totalLeads: leads.count ?? 0,
        newLeads,
        totalOffers: offers.count ?? 0,
        openOffers,
        totalInvoices: invoices.count ?? 0,
        openInvoices,
        totalContracts: contracts.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">Übersicht</h2>

      {/* Urgent actions */}
      <div className="space-y-2">
        {(stats?.newLeads ?? 0) > 0 && (
          <button
            onClick={() => navigate('/admin/leads')}
            className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          >
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {stats!.newLeads} neue Leads
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" />
          </button>
        )}
        {(stats?.openOffers ?? 0) > 0 && (
          <button
            onClick={() => navigate('/admin/documents')}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {stats!.openOffers} offene Angebote
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {(stats?.openInvoices ?? 0) > 0 && (
          <button
            onClick={() => navigate('/admin/documents')}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {stats!.openInvoices} offene Rechnungen
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/admin/leads')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Leads</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalLeads ?? 0}</p>
        </button>
        <button onClick={() => navigate('/admin/documents')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Angebote</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalOffers ?? 0}</p>
        </button>
        <button onClick={() => navigate('/admin/documents')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Rechnungen</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalInvoices ?? 0}</p>
        </button>
        <button onClick={() => navigate('/admin/documents')} className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
          <p className="text-xs text-muted-foreground mb-1">Verträge</p>
          <p className="text-2xl font-bold text-foreground">{stats?.totalContracts ?? 0}</p>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
