import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, FileText, XCircle } from 'lucide-react';
import SignaturePad from '@/components/shared/SignaturePad';
import { formatDateDE } from '@/lib/utils';
import { DocumentShell, DocumentHeader, DocumentMeta, ItemsTable, TotalsBlock } from '@/components/public-document';

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
      const { data, error } = await supabase
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
        .update({ status: 'aktiv' } as any)
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

  const isSigned = contract?.status === 'unterzeichnet' || contract?.status === 'aktiv' || !!existingAcceptance || signed;
  const isRejected = contract?.status === 'abgelehnt' || rejected;

  const customer = contract ? (contract as any).customer : null;
  const isSmallBusiness = !!(settings as any)?.small_business_regulation;

  // Signed screen
  if (isSigned && contract) {
    return (
      <DocumentShell>
        <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center mt-6">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
          <h3 className="text-lg font-bold text-green-800">Vertrag unterzeichnet</h3>
          <p className="mt-1 text-sm text-green-600">
            {existingAcceptance
              ? `Unterzeichnet von ${existingAcceptance.accepted_by_name} am ${formatDateDE(existingAcceptance.accepted_at)}`
              : signed
              ? `Unterzeichnet von ${acceptName}`
              : 'Dieser Vertrag wurde bereits unterzeichnet.'}
          </p>
        </div>
      </DocumentShell>
    );
  }

  // Rejected screen
  if (isRejected && contract) {
    return (
      <DocumentShell>
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center mt-6">
          <XCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h3 className="text-lg font-bold text-red-800">Vertrag abgelehnt</h3>
          <p className="mt-1 text-sm text-red-600">Dieser Vertrag wurde abgelehnt.</p>
        </div>
      </DocumentShell>
    );
  }

  return (
    <DocumentShell isLoading={isLoading} showNotFound={!isLoading && !contract} notFoundMessage="Vertrag nicht gefunden">
      <DocumentHeader
        businessName={settings?.business_name}
        street={settings?.street ?? undefined}
        houseNumber={(settings as any)?.house_number ?? undefined}
        postalCode={settings?.postal_code ?? undefined}
        city={settings?.city ?? undefined}
        logoUrl={settings?.logo_url ?? undefined}
        email={settings?.email ?? undefined}
        phone={settings?.phone ?? undefined}
        recipientName={customer?.name}
        recipientAddress={customer ? [customer.street && customer.house_number ? `${customer.street} ${customer.house_number}` : customer.street, customer.postal_code && customer.city ? `${customer.postal_code} ${customer.city}` : customer.city].filter(Boolean).join('\n') : undefined}
      />

      {/* Contract details */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-7 py-6 space-y-6">
        <DocumentMeta
          title={contract?.title || 'Vertrag'}
          serviceTypeLabel={`Wiederkehrend (${frequencyLabels[contract?.frequency || ''] || contract?.frequency})`}
          fields={[
            { label: 'Vertragsnummer', value: contract?.contract_number || '' },
            { label: 'Vertragsbeginn', value: formatDateDE(contract?.start_date) },
            { label: contract?.end_date ? 'Vertragsende' : 'Laufzeit', value: contract?.end_date ? formatDateDE(contract.end_date) : 'Unbefristet' },
          ]}
        />

        {/* Items */}
        {items.length > 0 && (
          <div>
            <ItemsTable items={items as any[]} label="Leistungsumfang" />
            <TotalsBlock
              subtotal={contract?.subtotal || 0}
              taxTotal={contract?.tax_total || 0}
              grandTotal={contract?.grand_total || 0}
              isSmallBusiness={isSmallBusiness}
              grandTotalLabel="Gesamtbetrag pro Zyklus"
            />
          </div>
        )}
      </div>

      {/* Sign form */}
      <div className="space-y-4">
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
    </DocumentShell>
  );
};

export default PublicContractView;
