import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, XCircle, ShieldCheck } from 'lucide-react';
import SignaturePad from '@/components/shared/SignaturePad';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatEUR } from '@/lib/utils';

const PublicOfferView = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Customer data fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [vatId, setVatId] = useState('');

  // Signature state
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [hasValidSignature, setHasValidSignature] = useState(false);
  const [_showValidation, setShowValidation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // Prefill customer data from existing offer customer
  useEffect(() => {
    if (offer) {
      const customer = (offer as any).customer;
      if (customer) {
        setCompanyName(customer.name || '');
        setContactPerson(customer.contact_person || '');
        setStreet(customer.street || '');
        setHouseNumber(customer.house_number || '');
        setPostalCode(customer.postal_code || '');
        setCity(customer.city || '');
        setEmail(customer.email || '');
      }
    }
  }, [offer]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!companyName.trim()) throw new Error('missing_name');
      if (!street.trim()) throw new Error('missing_street');
      if (!postalCode.trim()) throw new Error('missing_postal');
      if (!city.trim()) throw new Error('missing_city');
      if (!hasValidSignature || !signatureImage) throw new Error('missing_signature');

      // Update customer data
      const customer = (offer as any).customer;
      if (customer) {
        await supabase.from('customers').update({
          name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          street: street.trim(),
          house_number: houseNumber.trim() || null,
          postal_code: postalCode.trim(),
          city: city.trim(),
          email: email.trim() || null,
        } as any).eq('id', customer.id);
      }

      // Insert acceptance record
      const { error: acceptError } = await supabase.from('offer_acceptances').insert({
        offer_id: offer!.id,
        accepted_by_name: companyName.trim(),
        signature_image: signatureImage,
      } as any);
      if (acceptError) throw acceptError;

      // Freeze accepted snapshot and update status
      const acceptedSnapshot = {
        offer_number: offer!.offer_number,
        date: offer!.date,
        customer_name: companyName.trim(),
        contact_person: contactPerson.trim() || null,
        customer_address: [
          [street.trim(), houseNumber.trim()].filter(Boolean).join(' '),
          [postalCode.trim(), city.trim()].filter(Boolean).join(' '),
        ].filter(Boolean).join(', '),
        customer_email: email.trim() || null,
        customer_vat_id: vatId.trim() || null,
        items: items.map((i: any) => ({
          title: i.title, description: i.description, quantity: i.quantity,
          unit: i.unit, unit_price: i.unit_price, tax_rate: i.tax_rate, total: i.total,
        })),
        subtotal: offer!.subtotal,
        tax_total: offer!.tax_total,
        grand_total: offer!.grand_total,
        intro_text: (offer as any).intro_text,
        footer_text: (offer as any).footer_text,
        closing_text: (offer as any).closing_text,
        notes: offer!.notes,
        accepted_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('offers')
        .update({
          status: 'accepted',
          notes: offer!.notes
            ? `${offer!.notes}\n\n---\nAccepted snapshot: ${JSON.stringify(acceptedSnapshot)}`
            : `Accepted snapshot: ${JSON.stringify(acceptedSnapshot)}`,
        } as any)
        .eq('id', offer!.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setAccepted(true);
      setShowValidation(false);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['public-offer', token] });
      queryClient.invalidateQueries({ queryKey: ['public-offer-acceptance', offer?.id] });
    },
    onError: (error: any) => {
      setShowValidation(true);
      const errorMap: Record<string, string> = {
        missing_name: 'Bitte geben Sie Ihren Firmen-/Namen ein.',
        missing_street: 'Bitte geben Sie Ihre Straße ein.',
        missing_postal: 'Bitte geben Sie Ihre Postleitzahl ein.',
        missing_city: 'Bitte geben Sie Ihren Ort ein.',
        missing_signature: t.offers.signatureRequired,
      };
      setErrorMessage(errorMap[error?.message] || t.offers.acceptSubmitFailed);
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
    setErrorMessage(null);
    const valid = !!companyName.trim() && !!street.trim() && !!postalCode.trim() && !!city.trim() && hasValidSignature && !!signatureImage;
    setShowValidation(!valid);
    if (!valid) {
      if (!companyName.trim()) setErrorMessage('Bitte geben Sie Ihren Firmen-/Namen ein.');
      else if (!street.trim()) setErrorMessage('Bitte geben Sie Ihre Straße ein.');
      else if (!postalCode.trim()) setErrorMessage('Bitte geben Sie Ihre Postleitzahl ein.');
      else if (!city.trim()) setErrorMessage('Bitte geben Sie Ihren Ort ein.');
      else setErrorMessage(t.offers.signatureRequired);
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

  // Success screen
  if (isAlreadyAccepted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-lg px-4 py-16 sm:py-24 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <ShieldCheck className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Angebot erfolgreich bestätigt</h1>
          <p className="text-sm text-gray-500">
            Vielen Dank. Sie erhalten die weiteren Unterlagen direkt vom Anbieter.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{offer.offer_number}</p>
                <p className="text-xs text-gray-500">
                  {settings?.business_name || 'Anbieter'}
                </p>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatEUR(offer.grand_total)}</p>
            {existingAcceptance && (
              <>
                <p className="text-sm text-gray-500">
                  Bestätigt von: <span className="font-medium text-gray-900">{(existingAcceptance as any).accepted_by_name}</span>
                </p>
                {(existingAcceptance as any).signature_image && (
                  <div className="mt-2 max-w-[200px]">
                    <img src={(existingAcceptance as any).signature_image} alt="Unterschrift" className="border border-gray-200 rounded" />
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 pt-4">Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    );
  }

  // Rejected screen
  if (isAlreadyRejected) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-lg">
          <div className="mt-12 rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-red-800">Angebot abgelehnt</h3>
            <p className="mt-1 text-sm text-red-600">
              {(offer as any).rejected_reason
                ? `Grund: ${(offer as any).rejected_reason}`
                : 'Dieses Angebot wurde abgelehnt.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header with branding */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
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
              <img src={settings.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
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
              <p className="mt-1 text-sm text-gray-600">Für: {customer.name}</p>
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
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
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
                          {item.description && <p className="text-gray-500 text-xs">{item.description}</p>}
                        </td>
                        <td className="py-2 pr-2 text-right text-gray-700">{item.quantity.toFixed(2).replace('.', ',')}</td>
                        <td className="py-2 pr-2 text-gray-700">{item.unit}</td>
                        <td className="py-2 pr-2 text-right text-gray-700">{formatEUR(item.unit_price)}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{formatEUR(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile card layout */}
              <div className="sm:hidden space-y-3">
                {items.map((item: any, i: number) => (
                  <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{i + 1}. {item.title}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                      </div>
                      <p className="font-semibold text-gray-900 shrink-0">{formatEUR(item.total)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.quantity.toFixed(2).replace('.', ',')} {item.unit} × {formatEUR(item.unit_price)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1 border-t-2 border-gray-200 pt-3">
                {!isSmallBusiness && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Zwischensumme</span>
                      <span>{formatEUR(offer.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>MwSt.</span>
                      <span>{formatEUR(offer.tax_total)}</span>
                    </div>
                  </>
                )}
                <div className={`flex justify-between text-base font-bold text-gray-900 ${!isSmallBusiness ? 'pt-1 border-t border-gray-200' : ''}`}>
                  <span>Gesamtbetrag</span>
                  <span>{formatEUR(offer.grand_total)}</span>
                </div>
                {isSmallBusiness && (
                  <p className="text-xs text-gray-500 italic">
                    Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer / closing text */}
          {(offer as any).footer_text && (
            <p className="mb-4 text-sm text-gray-700 whitespace-pre-line">{(offer as any).footer_text}</p>
          )}
          {(offer as any).closing_text && (
            <p className="mb-4 text-sm text-gray-700">{(offer as any).closing_text}</p>
          )}

          {/* Validity */}
          {validityDate && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${expired ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              {expired
                ? `Dieses Angebot ist am ${validityDate} abgelaufen.`
                : `Gültig bis ${validityDate}`}
            </div>
          )}

          {/* Notes */}
          {offer.notes && (
            <p className="mb-4 text-sm text-gray-600 whitespace-pre-line">{offer.notes}</p>
          )}
        </div>

        {/* Expired block */}
        {expired && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-700 font-medium">Dieses Angebot ist abgelaufen und kann nicht mehr angenommen werden.</p>
          </div>
        )}

        {/* Client completion + signing form */}
        {!expired && (
          <form onSubmit={handleAccept} className="space-y-6" noValidate>
            {/* Customer data confirmation */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Bitte bestätigen Sie Ihre Daten</h3>
              <p className="text-sm text-gray-500 -mt-2">
                Ergänzen oder korrigieren Sie Ihre Angaben vor der Bestätigung.
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Firma / Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setErrorMessage(null); }}
                  placeholder="Firma oder vollständiger Name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ansprechpartner <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Straße *</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => { setStreet(e.target.value); setErrorMessage(null); }}
                    placeholder="Straße"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hausnr.</label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="Nr."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">PLZ *</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => { setPostalCode(e.target.value); setErrorMessage(null); }}
                    placeholder="PLZ"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ort *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setErrorMessage(null); }}
                    placeholder="Ort"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    E-Mail <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@beispiel.de"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    USt-IdNr. <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vatId}
                    onChange={(e) => setVatId(e.target.value)}
                    placeholder="DE123456789"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Signature section */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Angebot bestätigen & unterschreiben</h3>

              <SignaturePad
                onSignatureChange={(dataUrl) => {
                  setSignatureImage(dataUrl);
                  if (dataUrl) { setErrorMessage(null); setShowValidation(false); }
                }}
                onSignatureStateChange={(has) => {
                  setHasValidSignature(has);
                  if (has) { setErrorMessage(null); setShowValidation(false); }
                }}
                clearLabel="Unterschrift löschen"
                instructionLabel="Bitte unterschreiben Sie hier"
              />

              {errorMessage && (
                <p className="text-sm font-medium text-red-600">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={acceptMutation.isPending}
                className="w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acceptMutation.isPending ? 'Wird verarbeitet…' : 'Angebot verbindlich bestätigen'}
              </button>

              <p className="text-xs text-center text-gray-500">
                Mit Ihrer Unterschrift bestätigen Sie die Richtigkeit Ihrer Angaben und die Annahme des Angebots.
              </p>
            </div>

            {/* Reject section */}
            <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
              {!showRejectConfirm ? (
                <button
                  type="button"
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
                    Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.
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
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRejectConfirm(false)}
                      className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
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
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-gray-400">Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    </div>
  );
};

export default PublicOfferView;
