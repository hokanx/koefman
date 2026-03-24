import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from '@/components/shared/StatusBadge';
import type { Offer, OfferStatus } from '@/types';

const OfferDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const statusLabels: Record<OfferStatus, string> = {
    draft: t.offers.draft, sent: t.offers.sent, accepted: t.offers.accepted, rejected: t.offers.rejected,
  };

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, customer:customers(name)')
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as Offer & { customer: { name: string } | null };
    },
    enabled: !!user && !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['offer-items', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offer_items')
        .select('*')
        .eq('offer_id', id!)
        .order('sort_order');
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!offer) {
    return <div className="p-6 text-center text-muted-foreground">{t.common.noResults}</div>;
  }

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate('/offers')} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{offer.offer_number}</h2>
              <p className="text-sm text-muted-foreground">{(offer as any).customer?.name}</p>
            </div>
            <StatusBadge status={offer.status} label={statusLabels[offer.status]} />
          </div>
          <p className="text-sm text-muted-foreground">{t.offers.date}: {new Date(offer.date).toLocaleDateString()}</p>
          {offer.notes && <p className="mt-2 text-sm text-foreground">{offer.notes}</p>}
        </div>

        {items.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-3 font-semibold text-foreground">{t.offers.items}</h3>
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    <p className="text-muted-foreground">{item.quantity} × {t.common.currency}{item.unit_price.toFixed(2)}</p>
                  </div>
                  <p className="font-medium text-foreground">{t.common.currency}{item.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.offers.subtotal}</span>
                <span>{t.common.currency}{offer.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.offers.taxTotal}</span>
                <span>{t.common.currency}{offer.tax_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t.offers.grandTotal}</span>
                <span>{t.common.currency}{offer.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferDetail;
