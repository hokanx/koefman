import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Inbox, Eye, UserPlus, Archive, Copy, Check, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SearchBar from '@/components/shared/SearchBar';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';
import { formatAddress } from '@/types';
import { formatDateDE } from '@/lib/generatePdf';

interface IntakeSubmission {
  id: string;
  owner_id: string;
  company_or_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  business_category: string | null;
  service_type: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  repair_notes: string | null;
  property_size: string | null;
  cleaning_frequency: string | null;
  service_location: string | null;
  service_notes: string | null;
  status: string;
  converted_customer_id: string | null;
  created_at: string;
}

const Leads = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>(searchParams.get('status') || 'all');
  const [selected, setSelected] = useState<IntakeSubmission | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setFilter(s);
  }, [searchParams]);

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intake_submissions' as any)
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IntakeSubmission[];
    },
    enabled: !!user,
  });

  const intakeToken = (settings as any)?.intake_token;
  const intakeLink = intakeToken ? `${window.location.origin}/intake/${intakeToken}` : '';

  const copyLink = () => {
    if (!intakeLink) return;
    navigator.clipboard.writeText(intakeLink);
    setLinkCopied(true);
    toast.success(t.leads.linkCopied);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, silent }: { id: string; status: string; silent?: boolean }) => {
      const { error } = await supabase.from('intake_submissions' as any).update({ status } as any).eq('id', id);
      if (error) throw error;
      return { silent };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['new-leads-count'] });
      if (!variables.silent) setSelected(null);
    },
  });

  const convertToCustomer = useMutation({
    mutationFn: async (lead: IntakeSubmission) => {
      const address = formatAddress({ street: lead.street || undefined, house_number: lead.house_number || undefined, postal_code: lead.postal_code || undefined, city: lead.city || undefined, country: lead.country || undefined });
      const { data: customer, error } = await supabase.from('customers').insert({
        user_id: user!.id,
        name: lead.company_or_name,
        contact_person: lead.contact_person,
        phone: lead.phone,
        email: lead.email,
        street: lead.street,
        house_number: lead.house_number,
        postal_code: lead.postal_code,
        city: lead.city,
        country: lead.country,
        notes: lead.notes,
        address,
      } as any).select().single();
      if (error) throw error;

      // Insert extension fields if relevant
      const cat = lead.business_category || 'general';
      if (cat !== 'general' && customer) {
        await supabase.from('customer_extensions').insert({
          customer_id: customer.id,
          business_category: cat,
          vehicle_plate: lead.vehicle_plate,
          vehicle_brand: lead.vehicle_brand,
          vehicle_model: lead.vehicle_model,
          repair_notes: lead.repair_notes,
          property_size: lead.property_size,
          cleaning_frequency: lead.cleaning_frequency,
          service_location: lead.service_location,
          service_notes: lead.service_notes,
        });
      }

      // Update submission status
      await supabase.from('intake_submissions' as any).update({ status: 'converted', converted_customer_id: customer.id } as any).eq('id', lead.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['new-leads-count'] });
      toast.success(t.leads.convertedSuccess);
      setSelected(null);
    },
    onError: () => toast.error(t.common.error),
  });

  const filtered = leads.filter(l => {
    const matchSearch = l.company_or_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email?.toLowerCase().includes(search.toLowerCase())) ||
      (l.phone?.includes(search));
    const matchFilter = filter === 'all' || l.status === filter;
    return matchSearch && matchFilter;
  });

  const statusColors: Record<string, string> = {
    new: 'info', reviewed: 'warning', converted: 'success', archived: 'default',
  };

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t.leads.title}</h2>
      </div>

      {/* Intake link section */}
      {intakeLink && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-2">{t.leads.shareLink}</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={intakeLink}
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-xs text-muted-foreground truncate"
            />
            <button onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{linkCopied ? t.leads.copied : t.leads.copyLink}</span>
            </button>
            <button onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">{t.leads.showQr}</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t.leads.shareLinkDesc}</p>
        </div>
      )}

      {/* QR Code Modal */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setQrOpen(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-2">{t.leads.qrTitle}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t.leads.qrDescription}</p>
            <div className="flex justify-center mb-6">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={intakeLink} size={220} level="M" />
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={copyLink}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {linkCopied ? t.leads.copied : t.leads.copyLink}
              </button>
              <button onClick={() => setQrOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder={t.leads.searchPlaceholder} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground">
          <option value="all">{t.common.all}</option>
          <option value="new">{t.leads.statusNew}</option>
          <option value="reviewed">{t.leads.statusReviewed}</option>
          <option value="converted">{t.leads.statusConverted}</option>
          <option value="archived">{t.leads.statusArchived}</option>
        </select>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card p-4 sm:p-6"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">{selected.company_or_name}</h3>
              <StatusBadge status={selected.status as any} label={(t.status as any)[selected.status] || selected.status} />
            </div>

            <div className="space-y-3 text-sm">
              {selected.contact_person && <div><span className="text-muted-foreground">{t.intake.contactPerson}:</span> <span className="text-foreground">{selected.contact_person}</span></div>}
              {selected.email && <div><span className="text-muted-foreground">{t.intake.email}:</span> <span className="text-foreground">{selected.email}</span></div>}
              {selected.phone && <div><span className="text-muted-foreground">{t.intake.phone}:</span> <span className="text-foreground">{selected.phone}</span></div>}
              {(selected.street || selected.city) && (
                <div><span className="text-muted-foreground">{t.intake.addressSection}:</span> <span className="text-foreground whitespace-pre-line">{formatAddress({ street: selected.street || undefined, house_number: selected.house_number || undefined, postal_code: selected.postal_code || undefined, city: selected.city || undefined, country: selected.country || undefined })}</span></div>
              )}
              {selected.service_type && <div><span className="text-muted-foreground">{t.intake.serviceType}:</span> <span className="text-foreground">{selected.service_type}</span></div>}
              {selected.notes && <div><span className="text-muted-foreground">{t.intake.messageNotes}:</span> <span className="text-foreground">{selected.notes}</span></div>}
              {selected.vehicle_plate && <div><span className="text-muted-foreground">{t.garage.vehiclePlate}:</span> <span className="text-foreground">{selected.vehicle_plate}</span></div>}
              {selected.vehicle_brand && <div><span className="text-muted-foreground">{t.garage.vehicleBrand}:</span> <span className="text-foreground">{selected.vehicle_brand}</span></div>}
              {selected.vehicle_model && <div><span className="text-muted-foreground">{t.garage.vehicleModel}:</span> <span className="text-foreground">{selected.vehicle_model}</span></div>}
              {selected.repair_notes && <div><span className="text-muted-foreground">{t.garage.repairNotes}:</span> <span className="text-foreground">{selected.repair_notes}</span></div>}
              {selected.property_size && <div><span className="text-muted-foreground">{t.cleaning.propertySize}:</span> <span className="text-foreground">{selected.property_size}</span></div>}
              {selected.cleaning_frequency && <div><span className="text-muted-foreground">{t.cleaning.cleaningFrequency}:</span> <span className="text-foreground">{selected.cleaning_frequency}</span></div>}
              {selected.service_location && <div><span className="text-muted-foreground">{t.cleaning.serviceLocation}:</span> <span className="text-foreground">{selected.service_location}</span></div>}
              {selected.service_notes && <div><span className="text-muted-foreground">{t.cleaning.serviceNotes}:</span> <span className="text-foreground">{selected.service_notes}</span></div>}
              <div className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString()}</div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {selected.status === 'new' && (
                <button onClick={() => updateStatus.mutate({ id: selected.id, status: 'reviewed' })}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/80">
                  <Eye className="h-4 w-4" /> {t.leads.markReviewed}
                </button>
              )}
              {selected.status !== 'converted' && (
                <button onClick={() => convertToCustomer.mutate(selected)} disabled={convertToCustomer.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  <UserPlus className="h-4 w-4" /> {t.leads.convertToCustomer}
                </button>
              )}
              {selected.status !== 'archived' && selected.status !== 'converted' && (
                <button onClick={() => updateStatus.mutate({ id: selected.id, status: 'archived' })}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
                  <Archive className="h-4 w-4" /> {t.leads.archive}
                </button>
              )}
              {selected.converted_customer_id && (
                <Link to={`/customers/${selected.converted_customer_id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                  {t.leads.viewCustomer}
                </Link>
              )}
              <button onClick={() => setSelected(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent">
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={search || filter !== 'all' ? t.common.noResults : t.leads.noLeads}
          description={search || filter !== 'all' ? '' : t.leads.noLeadsDesc}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <button key={lead.id} onClick={() => {
                setSelected(lead);
                if (lead.status === 'new') {
                  updateStatus.mutate({ id: lead.id, status: 'reviewed', silent: true });
                }
              }}
              className="card-hover block w-full text-start rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground truncate">{lead.company_or_name}</h3>
                  {lead.contact_person && <p className="text-sm text-muted-foreground">{lead.contact_person}</p>}
                </div>
                <StatusBadge status={lead.status as any} label={(t.status as any)[lead.status] || lead.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {lead.email && <span>{lead.email}</span>}
                {lead.phone && <span>{lead.phone}</span>}
                {lead.service_type && <span className="text-xs rounded-full bg-muted px-2 py-0.5">{lead.service_type}</span>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{formatDateDE(lead.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leads;
