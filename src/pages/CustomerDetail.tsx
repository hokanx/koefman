import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Customer } from '@/types';

const CustomerDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!user && !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customers').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(t.common.success);
      navigate('/customers');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 text-center text-muted-foreground">{t.common.noResults}</div>
    );
  }

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate('/customers')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
            <span className="text-sm text-muted-foreground">
              {customer.customer_type === 'business' ? t.customers.business : t.customers.private}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm(t.customers.deleteConfirm)) deleteMutation.mutate();
              }}
              className="rounded-md p-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {customer.contact_person && (
            <p className="text-muted-foreground">{t.customers.contactPerson}: {customer.contact_person}</p>
          )}
          {customer.phone && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {customer.phone}
            </p>
          )}
          {customer.email && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> {customer.email}
            </p>
          )}
          {customer.address && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {customer.address}
            </p>
          )}
          {customer.notes && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t.customers.notes}</p>
              <p className="text-foreground">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
