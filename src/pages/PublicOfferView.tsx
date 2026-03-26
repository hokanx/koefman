import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatAddress } from '@/types';
import { CheckCircle, FileText, XCircle } from 'lucide-react';
import SignaturePad from '@/components/shared/SignaturePad';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatEUR } from '@/lib/utils';

const PublicOfferView = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [acceptName, setAcceptName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [hasValidSignature, setHasValidSignature] = useState(false);
  const [showAcceptValidation, setShowAcceptValidation] = useState(false);
  const [acceptErrorMessage, setAcceptErrorMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: offer, isLoading } = useQuery({
    queryKey: ['public-offer', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, customer:customers(*)')
        .eq('public_token', token!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['public-offer-items', offer?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offer_items')
        .select('*')
        .eq('offer_id', offer!.id)
        .order('sort_order');
      return data || [];
    },
    enabled: !!offer?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ['public-business-settings', offer?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', offer!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!offer?.user_id,
  });

  const { data: existingAcceptance } = useQuery({
    queryKey: ['public-offer-acceptance', offer?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('offer_acceptances')
        .select('*')
        .eq('offer_id', offer!.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!offer?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = acceptName.trim();

      if (!trimmedName) {
        throw new Error('missing_name');
      }

      if (!hasValidSignature) {
        throw new Error('missing_signature');
      }

      if (!signatureImage) {
        throw new Error('invalid_signature_data');
      }

      const { error: acceptError } = await supabase.from('offer_acceptances').insert({
        offer_id: offer!.id,
        accepted_by_name: trimmedName,
        signature_image: signatureImage,
      } as any);
      if (acceptError) throw acceptError;

      const { error: updateError } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offer!.id);
      if (updateError) throw updateError;
    },
    onMutate: () => {
      setAcceptErrorMessage(null);
    },
    onSuccess: () => {
      setAccepted(true);
      setShowAcceptValidation(false);
      setAcceptErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['public-offer', token] });
      queryClient.invalidateQueries({ queryKey: ['public-offer-acceptance', offer?.id] });
    },
    onError: (error: any) => {
      setShowAcceptValidation(true);

      if (error?.message === 'missing_name') {
        setAcceptErrorMessage(t.offers.nameRequired);
        return;
      }

      if (error?.message === 'missing_signature') {
        setAcceptErrorMessage(t.offers.signatureRequired);
        return;
      }

      if (error?.message === 'invalid_signature_data') {
        setAcceptErrorMessage(t.offers.signatureProcessingFailed);
        return;
      }

      setAcceptErrorMessage(t.offers.acceptSubmitFailed);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('offers')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_reason: rejectReason.trim() || null,
        } as any)
        .eq('id', offer!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setRejected(true);
      setShowRejectConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['public-offer', token] });
    },
  });

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = acceptName.trim();
    const isValid = !!trimmedName && hasValidSignature && !!signatureImage;
    setShowAcceptValidation(!isValid);
    setAcceptErrorMessage(null);

    if (!trimmedName) {
      setAcceptErrorMessage(t.offers.nameRequired);
      return;
    }

    if (!hasValidSignature) {
      setAcceptErrorMessage(t.offers.signatureRequired);
      return;
    }

    if (!signatureImage) {
      setAcceptErrorMessage(t.offers.signatureProcessingFailed);
      return;
    }

    acceptMutation.mutate();
  };

  const isAlreadyAccepted = offer?.status === 'accepted' || !!existingAcceptance || accepted;
  const isAlreadyRejected = offer?.status === 'rejected' || rejected;

  const getValidityDate = (): string | null => {
    if (!offer) return null;
    const days = (offer as any).validity_days || 14;
    const offerDate = new Date(offer.date);
    offerDate.setDate(offerDate.getDate() + days);
    return offerDate.toLocaleDateString('de-DE');
  };

  const isExpired = (): boolean => {
    if (!offer) return false;
    const days = (offer as any).validity_days || 14;
    const offerDate = new Date(offer.date);
    offerDate.setDate(offerDate.getDate() + days);
    return new Date() > offerDate;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Angebot nicht gefunden</h1>
          <p className="mt-2 text-gray-500">Dieser Link ist ungültig oder abgelaufen.</p>
        </div>
      </div>
    );
  }

  const customer = (offer as any).customer;
  const validityDate = getValidityDate();
  const expired = isExpired();
  const isSmallBusiness = !!(settings as any)?.small_business_regulation;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header with branding */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {settings?.business_name || 'Unternehmen'}
              </h1>
              {settings && (
                <p className="mt-1 text-sm text-gray-500">
                  {[
                    settings.street && (settings as any).house_number
                      ? `${settings.street} ${(settings as any).house_number}`
                      : settings.street,
                    settings.postal_code && settings.city
                      ? `${settings.postal_code} ${settings.city}`
                      : settings.city,
                  ].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="h-12 w-auto object-contain"
              />
            )}
          </div>
        </div>

        {/* Offer details */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{offer.offer_number}</span>
              <span className="text-sm text-gray-500">
                {new Date(offer.date).toLocaleDateString('de-DE')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {(settings as any)?.default_offer_title || 'Angebot'}
            </h2>
            {customer && (
              <p className="mt-1 text-sm text-gray-600">
                Für: {customer.name}
              </p>
            )}
          </div>

          {/* Intro text */}
          {(offer as any).intro_text && (
            <p className="mb-6 text-sm text-gray-700 whitespace-pre-line">
              {(offer as any).intro_text}
            </p>
          )}

          {/* Items */}
          {items.length > 0 && (
            <div className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                      <th className="pb-2 pr-2 font-medium">Pos.</th>
                      <th className="pb-2 pr-2 font-medium">Bezeichnung</th>
                      <th className="pb-2 pr-2 text-right font-medium">Menge</th>
                      <th className="pb-2 pr-2 font-medium">Einheit</th>
                      <th className="pb-2 pr-2 text-right font-medium">Einzelpreis</th>
                      <th className="pb-2 text-right font-medium">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, i: number) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-2">
                          <p className="font-medium text-gray-900">{item.title}</p>
                          {item.description && (
                            <p className="text-gray-500 text-xs">{item.description}</p>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right text-gray-700">
                          {item.quantity.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-2 pr-2 text-gray-700">{item.unit}</td>
                        <td className="py-2 pr-2 text-right text-gray-700">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1 border-t-2 border-gray-200 pt-3">
                {!isSmallBusiness && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Zwischensumme</span>
                      <span>{formatCurrency(offer.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>MwSt.</span>
                      <span>{formatCurrency(offer.tax_total)}</span>
                    </div>
                  </>
                )}
                <div className={`flex justify-between text-base font-bold text-gray-900 ${!isSmallBusiness ? 'pt-1 border-t border-gray-200' : ''}`}>
                  <span>Gesamtbetrag</span>
                  <span>{formatCurrency(offer.grand_total)}</span>
                </div>
                {isSmallBusiness && (
                  <p className="text-xs text-gray-500 italic">
                    Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Validity */}
          {validityDate && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${expired ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              {expired
                ? `Dieses Angebot ist am ${validityDate} abgelaufen.`
                : `Dieses Angebot ist ${(offer as any).validity_days || 14} Tage gültig (bis ${validityDate}).`
              }
            </div>
          )}

          {/* Notes */}
          {offer.notes && (
            <p className="mb-4 text-sm text-gray-600 whitespace-pre-line">{offer.notes}</p>
          )}
        </div>

        {/* Acceptance / Rejection section */}
        {isAlreadyAccepted ? (
          <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-bold text-green-800">Angebot angenommen</h3>
            <p className="mt-1 text-sm text-green-600">
              {existingAcceptance
                ? `Angenommen von ${(existingAcceptance as any).accepted_by_name} am ${new Date((existingAcceptance as any).accepted_at).toLocaleDateString('de-DE')}`
                : accepted
                ? `Angenommen von ${acceptName}`
                : 'Dieses Angebot wurde bereits angenommen.'
              }
            </p>
          </div>
        ) : isAlreadyRejected ? (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-red-800">Angebot abgelehnt</h3>
            <p className="mt-1 text-sm text-red-600">
              {(offer as any).rejected_reason
                ? `Grund: ${(offer as any).rejected_reason}`
                : 'Dieses Angebot wurde abgelehnt.'
              }
            </p>
          </div>
        ) : expired ? (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">Dieses Angebot ist abgelaufen und kann nicht mehr angenommen werden.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Accept form */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">{t.offers.acceptOfferTitle}</h3>
              </div>
              <form onSubmit={handleAccept} className="space-y-4" noValidate>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    {t.offers.signerNameLabel} *
                  </label>
                  <input
                    type="text"
                    value={acceptName}
                    onChange={(e) => {
                      setAcceptName(e.target.value);
                      if (showAcceptValidation && e.target.value.trim()) {
                        setAcceptErrorMessage(hasValidSignature && signatureImage ? null : acceptErrorMessage);
                      }
                    }}
                    placeholder={t.offers.signerNamePlaceholder}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    {t.offers.signature}
                  </label>
                  <SignaturePad
                    onSignatureChange={(dataUrl) => {
                      setSignatureImage(dataUrl);
                      if (dataUrl) {
                        setAcceptErrorMessage(null);
                        setShowAcceptValidation(false);
                      }
                    }}
                    onSignatureStateChange={(hasSignature) => {
                      setHasValidSignature(hasSignature);
                      if (hasSignature) {
                        setAcceptErrorMessage(null);
                        setShowAcceptValidation(false);
                      }
                    }}
                    clearLabel={t.offers.signatureClear}
                    instructionLabel={t.offers.signatureInstruction}
                  />
                </div>
                {showAcceptValidation && !acceptName.trim() && (
                  <p className="text-sm font-medium text-red-600">{t.offers.nameRequired}</p>
                )}
                {showAcceptValidation && !hasValidSignature && (
                  <p className="text-sm font-medium text-red-600">{t.offers.signatureRequired}</p>
                )}
                {showAcceptValidation && hasValidSignature && !signatureImage && (
                  <p className="text-sm font-medium text-red-600">{t.offers.signatureProcessingFailed}</p>
                )}
                {acceptErrorMessage && (
                  <p className="text-sm font-medium text-red-600">{acceptErrorMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={acceptMutation.isPending}
                  aria-busy={acceptMutation.isPending}
                  className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {acceptMutation.isPending ? t.offers.acceptSubmitting : t.offers.acceptOfferButton}
                </button>
                <p className="text-center text-sm text-gray-500">
                  {t.offers.acceptOfferHelper}
                </p>
                {import.meta.env.DEV && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                    <p>Name erkannt: {acceptName.trim() ? 'ja' : 'nein'}</p>
                    <p>Signatur erkannt: {hasValidSignature ? 'ja' : 'nein'}</p>
                    <p>Signaturdaten vorhanden: {signatureImage ? 'ja' : 'nein'}</p>
                    <p>Submit gesperrt: {acceptMutation.isPending ? 'ja' : 'nein'}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Reject section */}
            <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
              {!showRejectConfirm ? (
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  className="w-full rounded-lg border border-red-300 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Angebot ablehnen
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-bold text-gray-900">Angebot ablehnen</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sind Sie sicher, dass Sie dieses Angebot ablehnen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grund der Ablehnung (optional)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="z.B. Preis zu hoch, anderer Anbieter gewählt..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  {rejectMutation.isError && (
                    <p className="text-sm text-red-600">Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectConfirm(false)}
                      className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending}
                      className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {rejectMutation.isPending ? 'Wird verarbeitet...' : 'Endgültig ablehnen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicOfferView;
