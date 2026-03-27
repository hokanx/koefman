import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDateDE } from '@/lib/utils';
import { Building2, Users, FileText, Receipt } from 'lucide-react';

const AdminWorkspaces = () => {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from('business_settings')
        .select('user_id, business_name, owner_name, created_at, email');

      if (!settings) return [];

      // Get counts per user
      const { data: customers } = await supabase.from('customers').select('user_id');
      const { data: offers } = await supabase.from('offers').select('user_id');
      const { data: invoices } = await supabase.from('invoices').select('user_id');

      const countBy = (arr: { user_id: string }[] | null, uid: string) =>
        arr?.filter(r => r.user_id === uid).length ?? 0;

      return settings.map(s => ({
        ...s,
        customerCount: countBy(customers, s.user_id),
        offerCount: countBy(offers, s.user_id),
        invoiceCount: countBy(invoices, s.user_id),
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Firmen / Workspaces</h2>

      <div className="space-y-3">
        {workspaces?.map((w) => (
          <div key={w.user_id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="font-medium text-foreground">{w.business_name || '–'}</p>
              {w.owner_name && <p className="text-sm text-muted-foreground">{w.owner_name}</p>}
              {w.email && <p className="text-sm text-muted-foreground">{w.email}</p>}
              <p className="text-xs text-muted-foreground mt-1">Erstellt: {formatDateDE(w.created_at)}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{w.customerCount} Kunden</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>{w.offerCount} Angebote</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                <span>{w.invoiceCount} Rechnungen</span>
              </div>
            </div>
          </div>
        ))}

        {workspaces?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Keine Firmen vorhanden.</p>
        )}
      </div>
    </div>
  );
};

export default AdminWorkspaces;
