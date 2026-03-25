import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SearchBar from '@/components/shared/SearchBar';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDateDE } from '@/lib/generatePdf';
import type { Offer, OfferStatus } from '@/types';

const statusFilters: (OfferStatus | 'all')[] = ['all', 'draft', 'sent', 'accepted', 'rejected'];

const Offers = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'all'>('all');

  const statusLabels: Record<OfferStatus, string> = {
    draft: t.offers.draft,
    sent: t.offers.sent,
    accepted: t.offers.accepted,
    rejected: t.offers.rejected,
  };

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, customer:customers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as (Offer & { customer: { name: string } | null })[];
    },
    enabled: !!user,
  });

  const filtered = offers.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search && !o.offer_number.toLowerCase().includes(search.toLowerCase()) &&
      !o.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t.offers.title}</h2>
        <Link
          to="/offers/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t.offers.newOffer}</span>
        </Link>
      </div>

      <div className="mb-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t.common.search} />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? t.common.all : statusLabels[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || statusFilter !== 'all' ? t.common.noResults : t.offers.noOffers}
          description={t.offers.noOffersDesc}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((offer) => (
            <Link
              key={offer.id}
              to={`/offers/${offer.id}`}
              className="card-hover block rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{offer.offer_number}</h3>
                  <p className="text-sm text-muted-foreground">{offer.customer?.name}</p>
                </div>
                <StatusBadge status={offer.status} label={statusLabels[offer.status]} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatDateDE(offer.date)}</span>
                <span className="font-medium text-foreground">{t.common.currency}{offer.grand_total.toFixed(2)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Offers;
