import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Edit, Trash2, Car, Sparkles, FileText, Plus } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatAddress } from '@/types';
import { formatDateDE } from '@/lib/generatePdf';
import { formatEUR } from '@/lib/utils';
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
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).eq('user_id', user!.id).single();
      if (error) throw error;
      return data as any as Customer;
    },
    enabled: !!user && !!id,
  });

  const { data: extension } = useQuery({
    queryKey: ['customer-extension', id],
    queryFn: async () => {
      const { data } = await supabase.from('customer_extensions').select('*').eq('customer_id', id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: relatedOffers = [] } = useQuery({
    queryKey: ['customer-offers', id],
    queryFn: async () => {
      const { data } = await supabase.from('offers').select('id, offer_number, status, grand_total, date').eq('customer_id', id!).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: relatedInvoices = [] } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('id, invoice_number, status, grand_total, date').eq('customer_id', id!).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!id,
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
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  if (!customer) {
    return <div className="p-6 text-center text-muted-foreground">{t.common.noResults}</div>;
  }

  const addr = formatAddress(customer);
  const statusLabels = t.status as Record<string, string>;

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate('/customers')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
              <span className="text-sm text-muted-foreground">
                {customer.customer_type === 'business' ? t.customers.business : t.customers.private}
              </span>
            </div>
            <div className="flex gap-2">
              <Link to={`/customers/${id}/edit`} className="rounded-md p-2 text-muted-foreground hover:text-foreground">
                <Edit className="h-4 w-4" />
              </Link>
              <button onClick={() => { if (confirm(t.customers.deleteConfirm)) deleteMutation.mutate(); }}
                className="rounded-md p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {customer.contact_person && <p className="text-muted-foreground">{t.customers.contactPerson}: {customer.contact_person}</p>}
            {customer.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {customer.phone}</p>}
            {customer.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {customer.email}</p>}
            {addr && <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="h-4 w-4 mt-0.5" /> <span className="whitespace-pre-line">{addr}</span></p>}
            {customer.notes && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t.customers.notes}</p>
                <p className="text-foreground">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Smart suggestion: create offer */}
          <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
            <p className="text-sm text-muted-foreground mb-2">{t.customers.suggestCreateOffer}</p>
            <Link to={`/offers/new?customer=${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {t.offers.newOffer}
            </Link>
          </div>
        </div>

        {extension && extension.business_category !== 'general' && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
              {extension.business_category === 'garage' ? <Car className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {t.common.extensionFields}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {extension.business_category === 'garage' && (
                <>
                  {extension.vehicle_plate && <div><span className="text-muted-foreground">{t.garage.vehiclePlate}:</span> <span className="text-foreground">{extension.vehicle_plate}</span></div>}
                  {extension.vehicle_brand && <div><span className="text-muted-foreground">{t.garage.vehicleBrand}:</span> <span className="text-foreground">{extension.vehicle_brand}</span></div>}
                  {extension.vehicle_model && <div><span className="text-muted-foreground">{t.garage.vehicleModel}:</span> <span className="text-foreground">{extension.vehicle_model}</span></div>}
                  {extension.repair_notes && <div className="col-span-2"><span className="text-muted-foreground">{t.garage.repairNotes}:</span> <span className="text-foreground">{extension.repair_notes}</span></div>}
                </>
              )}
              {extension.business_category === 'cleaning' && (
                <>
                  {extension.property_size && <div><span className="text-muted-foreground">{t.cleaning.propertySize}:</span> <span className="text-foreground">{extension.property_size}</span></div>}
                  {extension.cleaning_frequency && <div><span className="text-muted-foreground">{t.cleaning.cleaningFrequency}:</span> <span className="text-foreground">{extension.cleaning_frequency}</span></div>}
                  {extension.service_location && <div><span className="text-muted-foreground">{t.cleaning.serviceLocation}:</span> <span className="text-foreground">{extension.service_location}</span></div>}
                  {extension.service_notes && <div className="col-span-2"><span className="text-muted-foreground">{t.cleaning.serviceNotes}:</span> <span className="text-foreground">{extension.service_notes}</span></div>}
                </>
              )}
            </div>
          </div>
        )}

        {relatedOffers.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 font-semibold text-foreground">{t.customers.relatedOffers}</h3>
            <div className="space-y-2">
              {relatedOffers.map((o: any) => (
                <Link key={o.id} to={`/offers/${o.id}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm hover:bg-muted/50">
                  <div>
                    <span className="font-medium text-foreground">{o.offer_number}</span>
                    <span className="ml-2 text-muted-foreground">{formatDateDE(o.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{formatEUR(o.grand_total)}</span>
                    <StatusBadge status={o.status} label={statusLabels[o.status] || o.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {relatedInvoices.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 font-semibold text-foreground">{t.customers.relatedInvoices}</h3>
            <div className="space-y-2">
              {relatedInvoices.map((inv: any) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm hover:bg-muted/50">
                  <div>
                    <span className="font-medium text-foreground">{inv.invoice_number}</span>
                    <span className="ml-2 text-muted-foreground">{formatDateDE(inv.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{formatEUR(inv.grand_total)}</span>
                    <StatusBadge status={inv.status} label={statusLabels[inv.status] || inv.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
