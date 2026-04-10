import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, XCircle, ShieldCheck } from 'lucide-react';
import SignaturePad from '@/components/shared/SignaturePad';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatEUR, formatDateDE } from '@/lib/utils';
import { DocumentShell, DocumentHeader, DocumentMeta, ItemsTable, TotalsBlock } from '@/components/public-document';

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

      const customer = (offer as any).customer;
      let customerId = offer!.customer_id;

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
      } else {
        const newId = crypto.randomUUID();
        const { error: custError } = await supabase.from('customers').insert({
          id: newId,
          user_id: offer!.user_id,
          name: companyName.trim(),
          contact_person: contactPerson.trim() || null,
          street: street.trim(),
          house_number: houseNumber.trim() || null,
          postal_code: postalCode.trim(),
          city: city.trim(),
          email: email.trim() || null,
        } as any);
        if (custError) throw custError;
        customerId = newId;
      }

      const { error: acceptError } = await supabase.from('offer_acceptances').insert({
        offer_id: offer!.id,
        accepted_by_name: companyName.trim(),
        signature_image: signatureImage,
      } as any);
      if (acceptError) throw acceptError;

      const { error: updateError } = await supabase
        .from('offers')
        .update({
          status: 'accepted',
          customer_id: customerId,
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
    return formatDateDE(offerDate);
  };

  const isExpired = (): boolean => {
    if (!offer) return false;
    const days = (offer as any).validity_days || 14;
    const offerDate = new Date(offer.date);
    offerDate.setDate(offerDate.getDate() + days);
    return new Date() > offerDate;
  };

  // Success screen
  if (isAlreadyAccepted && offer) {
    return (
      <DocumentShell>
        <div className="text-center space-y-6 py-8 sm:py-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <ShieldCheck className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Angebot erfolgreich bestätigt</h1>
          <p className="text-sm text-gray-500">
            Vielen Dank. Sie erhalten die weiteren Unterlagen direkt vom Anbieter.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-left space-y-3 mx-auto max-w-md">
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
        </div>
      </DocumentShell>
    );
  }

  // Rejected screen
  if (isAlreadyRejected && offer) {
    return (
      <DocumentShell>
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center mt-6">
          <XCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h3 className="text-lg font-bold text-red-800">Angebot abgelehnt</h3>
          <p className="mt-1 text-sm text-red-600">
            {(offer as any).rejected_reason
              ? `Grund: ${(offer as any).rejected_reason}`
              : 'Dieses Angebot wurde abgelehnt.'}
          </p>
        </div>
      </DocumentShell>
    );
  }

  const customer = offer ? (offer as any).customer : null;
  const validityDate = getValidityDate();
  const expired = isExpired();
  const isSmallBusiness = !!(settings as any)?.small_business_regulation;

  const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <DocumentShell isLoading={isLoading} showNotFound={!isLoading && !offer} notFoundMessage="Angebot nicht gefunden">
      <DocumentHeader
        businessName={settings?.business_name}
        street={settings?.street ?? undefined}
        houseNumber={(settings as any)?.house_number ?? undefined}
        postalCode={settings?.postal_code ?? undefined}
        city={settings?.city ?? undefined}
        logoUrl={settings?.logo_url ?? undefined}
        email={settings?.email ?? undefined}
        phone={settings?.phone ?? undefined}
        taxNumber={settings?.tax_number ?? undefined}
        vatId={settings?.vat_id ?? undefined}
        recipientName={customer?.name}
        recipientAddress={customer ? [customer.street && customer.house_number ? `${customer.street} ${customer.house_number}` : customer.street, customer.postal_code && customer.city ? `${customer.postal_code} ${customer.city}` : customer.city].filter(Boolean).join('\n') : undefined}
      />

      {/* Offer details */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-7 py-6 space-y-6">
        <DocumentMeta
          title={(settings as any)?.default_offer_title || 'Angebot'}
          serviceTypeLabel={(offer as any)?.service_type === 'laufend' ? 'Wiederkehrend' : 'Einmalig'}
          fields={[
            { label: 'Angebotsnummer', value: offer?.offer_number || '' },
            { label: 'Datum', value: formatDateDE(offer?.date) },
            ...(validityDate ? [{ label: expired ? 'Abgelaufen am' : 'Gültig bis', value: validityDate, highlight: expired }] : []),
          ]}
        />

        {/* Intro text */}
        {(offer as any)?.intro_text && (
          <p className="mb-6 text-sm text-gray-700 whitespace-pre-line">
            {(offer as any).intro_text}
          </p>
        )}

        {/* Items */}
        <ItemsTable items={items as any[]} />

        {/* Totals */}
        {items.length > 0 && (
          <TotalsBlock
            subtotal={offer?.subtotal || 0}
            taxTotal={offer?.tax_total || 0}
            grandTotal={offer?.grand_total || 0}
            isSmallBusiness={isSmallBusiness}
          />
        )}

        {/* Footer / closing text */}
        {(offer as any)?.footer_text && (
          <p className="mb-4 mt-6 text-sm text-gray-700 whitespace-pre-line">{(offer as any).footer_text}</p>
        )}
        {(offer as any)?.closing_text && (
          <p className="mb-4 text-sm text-gray-700">{(offer as any).closing_text}</p>
        )}

        {/* Validity (already shown in meta row) */}

        {/* Notes */}
        {offer?.notes && (
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
    </DocumentShell>
  );
};

export default PublicOfferView;
