import { Users, FileText, Receipt, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/shared/StatCard';

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: customerCount = 0 } = useQuery({
    queryKey: ['customer-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: offerCount = 0 } = useQuery({
    queryKey: ['offer-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: invoiceCounts = { total: 0, open: 0, paid: 0, overdue: 0 } } = useQuery({
    queryKey: ['invoice-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('status')
        .eq('user_id', user!.id);
      const invoices = data || [];
      return {
        total: invoices.length,
        open: invoices.filter((i) => i.status === 'open').length,
        paid: invoices.filter((i) => i.status === 'paid').length,
        overdue: invoices.filter((i) => i.status === 'overdue').length,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.dashboard.title}</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
        <StatCard title={t.dashboard.totalCustomers} value={customerCount} icon={Users} />
        <StatCard title={t.dashboard.totalOffers} value={offerCount} icon={FileText} />
        <StatCard title={t.dashboard.totalInvoices} value={invoiceCounts.total} icon={Receipt} />
        <StatCard title={t.dashboard.openInvoices} value={invoiceCounts.open} icon={Clock} variant="warning" />
        <StatCard title={t.dashboard.paidInvoices} value={invoiceCounts.paid} icon={CheckCircle} variant="success" />
        <StatCard title={t.dashboard.overdueInvoices} value={invoiceCounts.overdue} icon={AlertCircle} variant="destructive" />
      </div>
    </div>
  );
};

export default Dashboard;
