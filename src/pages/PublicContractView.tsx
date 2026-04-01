import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatAddress } from '@/types';
import { CheckCircle, FileText, XCircle } from 'lucide-react';
import SignaturePad from '@/components/shared/SignaturePad';
import { formatEUR, formatDateDE } from '@/lib/utils';

const PublicContractView = () => {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [acceptName, setAcceptName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [hasValidSignature, setHasValidSignature] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ['public-contract', token],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contracts')
        .select('*, customer:customers(*)')
        .eq('public_token', token!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['public-contract-items', contract?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract!.id)
        .order('sort_order');
      return data || [];
    },
    enabled: !!contract?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ['public-contract-settings', contract?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', contract!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!contract?.user_id,
  });

  const { data: existingAcceptance } = useQuery({
    queryKey: ['public-contract-acceptance', contract?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contract_acceptances' as any)
        .select('*')
        .eq('contract_id', contract!.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!contract?.id,
  });

  const frequencyLabels: Record<string, string> = {
    weekly: 'Wöchentlich',
    every_2_weeks: 'Alle 2 Wochen',
    monthly: 'Monatlich',
    quarterly: 'Vierteljährlich',
  };

  const signMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = acceptName.trim();
      if (!trimmedName) throw new Error('missing_name');
      if (!hasValidSignature) throw new Error('missing_signature');
      if (!signatureImage) throw new Error('invalid_signature_data');

      const { error: acceptError } = await supabase.from('contract_acceptances' as any).insert({
        contract_id: contract!.id,
        accepted_by_name: trimmedName,
        signature_image: signatureImage,
      } as any);
      if (acceptError) throw acceptError;

      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'unterzeichnet' } as any)
        .eq('id', contract!.id);
      if (updateError) throw updateError;
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: () => {
      setSigned(true);
      setShowValidation(false);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['public-contract', token] });
      queryClient.invalidateQueries({ queryKey: ['public-contract-acceptance', contract?.id] });
    },
    onError: (error: any) => {
      setShowValidation(true);
      if (error?.message === 'missing_name') {
        setErrorMessage('Bitte geben Sie Ihren Namen ein.');
      } else if (error?.message === 'missing_signature') {
        setErrorMessage('Bitte unterschreiben Sie den Vertrag.');
      } else if (error?.message === 'invalid_signature_data') {
        setErrorMessage('Die Unterschrift konnte nicht verarbeitet werden.');
      } else {
        setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'abgelehnt' } as any)
        .eq('id', contract!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setRejected(true);
      setShowRejectConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['public-contract', token] });
    },
  });

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = acceptName.trim();
    const isValid = !!trimmedName && hasValidSignature && !!signatureImage;
    setShowValidation(!isValid);
    setErrorMessage(null);

    if (!trimmedName) { setErrorMessage('Bitte geben Sie Ihren Namen ein.'); return; }
    if (!hasValidSignature) { setErrorMessage('Bitte unterschreiben Sie den Vertrag.'); return; }
    if (!signatureImage) { setErrorMessage('Die Unterschrift konnte nicht verarbeitet werden.'); return; }

    signMutation.mutate();
  };

  const isSigned = contract?.status === 'unterzeichnet' || !!existingAcceptance || signed;
  const isRejected = contract?.status === 'abgelehnt' || rejected;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Vertrag nicht gefunden</h1>
          <p className="mt-2 text-gray-500">Dieser Link ist ungültig oder abgelaufen.</p>
        </div>
      </div>
    );
  }

  const customer = (contract as any).customer;
  const isSmallBusiness = !!(settings as any)?.small_business_regulation;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
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
              <img src={settings.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
            )}
          </div>
        </div>

        {/* Contract details */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{contract.contract_number}</span>
              <span className="text-sm text-gray-500">
                {formatDateDE(contract.created_at)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{contract.title}</h2>
            {customer && (
              <p className="mt-1 text-sm text-gray-600">Für: {customer.name}</p>
            )}
          </div>

          {/* Contract info */}
          <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
            <div>
              <p className="text-gray-500">Abrechnungszyklus</p>
              <p className="font-medium text-gray-900">{frequencyLabels[contract.frequency] || contract.frequency}</p>
            </div>
            <div>
              <p className="text-gray-500">Vertragsbeginn</p>
              <p className="font-medium text-gray-900">{formatDateDE(contract.start_date)}</p>
            </div>
            {contract.end_date && (
              <div>
                <p className="text-gray-500">Vertragsende</p>
                <p className="font-medium text-gray-900">{new Date(contract.end_date).toLocaleDateString('de-DE')}</p>
              </div>
            )}
            {!contract.end_date && (
              <div>
                <p className="text-gray-500">Laufzeit</p>
                <p className="font-medium text-gray-900">Unbefristet</p>
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Leistungsumfang</h3>
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
                        <td className="py-2 pr-2 text-right text-gray-700">{Number(item.quantity).toFixed(2).replace('.', ',')}</td>
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
                    <p className="text-xs text-gray-500 mt-1">{Number(item.quantity).toFixed(2).replace('.', ',')} {item.unit} × {formatEUR(item.unit_price)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-1 border-t-2 border-gray-200 pt-3">
                {!isSmallBusiness && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Zwischensumme</span>
                      <span>{formatEUR(contract.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>MwSt.</span>
                      <span>{formatEUR(contract.tax_total)}</span>
                    </div>
                  </>
                )}
                <div className={`flex justify-between text-base font-bold text-gray-900 ${!isSmallBusiness ? 'pt-1 border-t border-gray-200' : ''}`}>
                  <span>Gesamtbetrag pro Zyklus</span>
                  <span>{formatEUR(contract.grand_total)}</span>
                </div>
                {isSmallBusiness && (
                  <p className="text-xs text-gray-500 italic">
                    Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Signature / Status section */}
        {isSigned ? (
          <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-bold text-green-800">Vertrag unterzeichnet</h3>
            <p className="mt-1 text-sm text-green-600">
              {existingAcceptance
                ? `Unterzeichnet von ${existingAcceptance.accepted_by_name} am ${new Date(existingAcceptance.accepted_at).toLocaleDateString('de-DE')}`
                : signed
                ? `Unterzeichnet von ${acceptName}`
                : 'Dieser Vertrag wurde bereits unterzeichnet.'}
            </p>
          </div>
        ) : isRejected ? (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-red-800">Vertrag abgelehnt</h3>
            <p className="mt-1 text-sm text-red-600">Dieser Vertrag wurde abgelehnt.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Sign form */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">Vertrag unterzeichnen</h3>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Mit Ihrer Unterschrift bestätigen Sie die oben genannten Vertragsbedingungen.
              </p>
              <form onSubmit={handleSign} className="space-y-4" noValidate>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    Ihr vollständiger Name *
                  </label>
                  <input
                    type="text"
                    value={acceptName}
                    onChange={(e) => {
                      setAcceptName(e.target.value);
                      if (showValidation && e.target.value.trim()) {
                        setErrorMessage(hasValidSignature && signatureImage ? null : errorMessage);
                      }
                    }}
                    placeholder="Vor- und Nachname"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    Unterschrift
                  </label>
                  <SignaturePad
                    onSignatureChange={(dataUrl) => {
                      setSignatureImage(dataUrl);
                      if (dataUrl) { setErrorMessage(null); setShowValidation(false); }
                    }}
                    onSignatureStateChange={(hasSignature) => {
                      setHasValidSignature(hasSignature);
                      if (hasSignature) { setErrorMessage(null); setShowValidation(false); }
                    }}
                    clearLabel="Zurücksetzen"
                    instructionLabel="Bitte unterschreiben Sie hier"
                  />
                </div>
                {showValidation && !acceptName.trim() && (
                  <p className="text-sm font-medium text-red-600">Bitte geben Sie Ihren Namen ein.</p>
                )}
                {showValidation && !hasValidSignature && (
                  <p className="text-sm font-medium text-red-600">Bitte unterschreiben Sie den Vertrag.</p>
                )}
                {errorMessage && (
                  <p className="text-sm font-medium text-red-600">{errorMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={signMutation.isPending}
                  className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {signMutation.isPending ? 'Wird verarbeitet...' : 'Vertrag verbindlich unterzeichnen'}
                </button>
                <p className="text-center text-sm text-gray-500">
                  Ihre digitale Unterschrift ist rechtlich bindend.
                </p>
              </form>
            </div>

            {/* Reject section */}
            <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
              {!showRejectConfirm ? (
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  className="w-full rounded-lg border border-red-300 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Vertrag ablehnen
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-bold text-gray-900">Vertrag ablehnen</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sind Sie sicher, dass Sie diesen Vertrag ablehnen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
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

export default PublicContractView;
