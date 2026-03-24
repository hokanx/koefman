import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Phone, Mail } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SearchBar from '@/components/shared/SearchBar';
import EmptyState from '@/components/shared/EmptyState';
import type { Customer } from '@/types';

const Customers = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user,
  });

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email?.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone?.includes(search))
  );

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t.customers.title}</h2>
        <Link
          to="/customers/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t.customers.newCustomer}</span>
        </Link>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder={t.customers.searchPlaceholder} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? t.common.noResults : t.customers.noCustomers}
          description={search ? '' : t.customers.noCustomersDesc}
          action={
            !search && (
              <Link
                to="/customers/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {t.customers.newCustomer}
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="card-hover block rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground truncate">{customer.name}</h3>
                  {customer.contact_person && (
                    <p className="text-sm text-muted-foreground">{customer.contact_person}</p>
                  )}
                </div>
                <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {customer.customer_type === 'business' ? t.customers.business : t.customers.private}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {customer.email}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Customers;
