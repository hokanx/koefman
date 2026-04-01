import { ArrowRight, FileText, Receipt, Upload, FileArchive, Inbox } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatEUR } from '@/lib/utils';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [
        { data: paidInvoices },
        { count: openCount },
        { data: expenses },
        { count: newLeads },
      ] = await Promise.all([
        supabase.from('invoices').select('grand_total').eq('user_id', user!.id).eq('status', 'paid'),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).in('status', ['open', 'draft']),
        supabase.from('documents').select('extracted_data, status').eq('user_id', user!.id),
        supabase.from('intake_submissions').select('*', { count: 'exact', head: true }).eq('owner_id', user!.id).eq('status', 'new'),
      ]);

      const totalRevenue = (paidInvoices || []).reduce((s, i) => s + Number(i.grand_total), 0);
      const totalExpenses = (expenses || []).reduce((s, d: any) => {
        const ext = d.extracted_data;
        const amt = ext?.gross_amount || ext?.amount || ext?.total || 0;
        return s + Number(amt);
      }, 0);
      const notExported = (expenses || []).filter((d: any) => d.status === 'neu' || d.status === 'hochgeladen').length;

      return {
        totalRevenue,
        totalExpenses,
        openInvoices: openCount || 0,
        notExported,
        newLeads: newLeads || 0,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="animate-fade-in p-4 md:p-6 space-y-5 mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">ÜBERSICHT</h1>

      {/* 3 Area Blocks */}
      <div className="space-y-3">
        {/* Einnahmen */}
        <button
          onClick={() => navigate('/revenue')}
          className="w-full rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Einnahmen</p>
              <p className="text-3xl font-bold text-foreground mt-1">{formatEUR(stats?.totalRevenue ?? 0)}</p>
              {(stats?.openInvoices ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{stats!.openInvoices} offen</p>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>

        {/* Ausgaben */}
        <button
          onClick={() => navigate('/expenses')}
          className="w-full rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ausgaben</p>
              <p className="text-3xl font-bold text-foreground mt-1">{formatEUR(stats?.totalExpenses ?? 0)}</p>
              {(stats?.notExported ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{stats!.notExported} nicht exportiert</p>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>

        {/* Steuer Export */}
        <button
          onClick={() => navigate('/tax-export')}
          className="w-full rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Steuer Export</p>
              <p className="text-lg font-semibold text-foreground mt-1">Export starten</p>
            </div>
            <FileArchive className="h-5 w-5 text-muted-foreground" />
          </div>
        </button>
      </div>

      {/* New Leads */}
      {(stats?.newLeads ?? 0) > 0 && (
        <button
          onClick={() => navigate('/leads')}
          className="w-full flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">{stats!.newLeads} neue Anfragen</span>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
