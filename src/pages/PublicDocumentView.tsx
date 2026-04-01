import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

const DOC_TYPE_LABELS: Record<string, string> = {
  offer: 'Angebot',
  invoice: 'Rechnung',
  contract: 'Vertrag',
  reminder: 'Mahnung',
};

const SIGNABLE_TYPES = ['offer', 'contract'];

const PublicDocumentView = () => {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [signerName, setSignerName] = useState('');
  const [signerAddress, setSignerAddress] = useState('');
  const [signError, setSignError] = useState('');
  const [accepted, setAccepted] = useState(false);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['public-org-document', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_documents' as any)
        .select('*')
        .eq('public_token', token!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!token,
  });

  const { data: existingAcceptance } = useQuery({
    queryKey: ['public-org-doc-acceptance', doc?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_document_acceptances' as any)
        .select('*')
        .eq('document_id', doc.id)
        .limit(1);
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: !!doc?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!signerName.trim()) throw new Error('Bitte geben Sie Ihren Namen ein.');
      const sigCanvas = sigPadRef.current;
      if (!sigCanvas || sigCanvas.isEmpty()) throw new Error('Bitte unterschreiben Sie das Dokument.');

      const signatureImage = sigCanvas.toDataURL('image/png');

      // Save client data into document if missing
      const updates: any = { status: 'accepted' };
      if (!doc.recipient_name && signerName.trim()) {
        updates.recipient_name = signerName.trim();
      }
      if (signerAddress.trim()) {
        const payload = doc.document_payload_json ?? {};
        updates.document_payload_json = {
          ...payload,
          client_address: signerAddress.trim(),
        };
      }

      // Insert acceptance record
      const { error: acceptError } = await supabase
        .from('org_document_acceptances' as any)
        .insert({
          document_id: doc.id,
          accepted_by_name: signerName.trim(),
          signature_image: signatureImage,
        } as any);
      if (acceptError) throw acceptError;

      // Update document status + client data
      const { error: updateError } = await supabase
        .from('org_documents' as any)
        .update(updates as any)
        .eq('id', doc.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: ['public-org-document', token] });
      queryClient.invalidateQueries({ queryKey: ['public-org-doc-acceptance', doc?.id] });
    },
    onError: (err: any) => {
      setSignError(err.message || 'Fehler bei der Annahme');
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Dokument nicht gefunden</h1>
          <p className="text-sm text-muted-foreground">Dieser Link ist ungültig oder das Dokument existiert nicht mehr.</p>
        </div>
      </div>
    );
  }

  const isSignable = SIGNABLE_TYPES.includes(doc.document_type);
  const isAlreadyAccepted = doc.status === 'accepted' || !!existingAcceptance;
  const showSuccess = accepted || isAlreadyAccepted;
  const payload = doc.document_payload_json ?? {};
  const amountFormatted = doc.amount_total != null && doc.amount_total > 0
    ? Number(doc.amount_total).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
    : null;

  const needsRecipientName = !doc.recipient_name;

  // Success screen
  if (showSuccess) {
    const displayAcceptance = existingAcceptance;
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-16 sm:py-24 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dokument erfolgreich bestätigt</h1>
          <p className="text-sm text-muted-foreground">
            {DOC_TYPE_LABELS[doc.document_type] || 'Dokument'}
            {doc.document_number && ` ${doc.document_number}`}
            {' '}wurde angenommen.
          </p>

          {/* Document summary */}
          <div className="rounded-xl border border-border bg-card p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{doc.title || '(Ohne Titel)'}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                  {doc.document_number && ` · ${doc.document_number}`}
                </p>
              </div>
            </div>
            {amountFormatted && (
              <p className="text-lg font-bold text-foreground">{amountFormatted}</p>
            )}
            {displayAcceptance?.accepted_by_name && (
              <p className="text-sm text-muted-foreground">
                Bestätigt von: <span className="font-medium text-foreground">{displayAcceptance.accepted_by_name}</span>
              </p>
            )}
            {displayAcceptance?.signature_image && (
              <div className="mt-2 max-w-[200px]">
                <img src={displayAcceptance.signature_image} alt="Unterschrift" className="border border-border rounded" />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-4">Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">{doc.title || '(Ohne Titel)'}</h1>
          <p className="text-sm text-muted-foreground">
            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
            {doc.document_number && ` · ${doc.document_number}`}
          </p>
          {amountFormatted && (
            <p className="text-xl font-bold text-foreground">{amountFormatted}</p>
          )}
        </div>

        {/* Content */}
        {doc.rendered_html ? (
          <div
            className="rounded-xl border border-border bg-card p-6 prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: doc.rendered_html }}
          />
        ) : doc.template_snapshot_json?.content_html ? (
          <div
            className="rounded-xl border border-border bg-card p-6 prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: doc.template_snapshot_json.content_html }}
          />
        ) : payload.description ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-foreground whitespace-pre-wrap">{payload.description}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Kein Dokumentinhalt verfügbar.</p>
          </div>
        )}

        {/* Recipient info (existing) */}
        {doc.recipient_name && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <span className="text-muted-foreground">Empfänger: </span>
            <span className="font-medium text-foreground">{doc.recipient_name}</span>
          </div>
        )}

        {/* Signing form */}
        {isSignable && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Annehmen & Unterschreiben</h2>

            {/* Client data fields */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Ihr Name {needsRecipientName && <span className="text-destructive">*</span>}
                </label>
                <Input
                  value={signerName}
                  onChange={(e) => { setSignerName(e.target.value); setSignError(''); }}
                  placeholder="Vor- und Nachname"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Adresse <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <Textarea
                  value={signerAddress}
                  onChange={(e) => setSignerAddress(e.target.value)}
                  placeholder="Straße, PLZ Ort"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Signature */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Unterschrift <span className="text-destructive">*</span></label>
              <div
                ref={containerRef}
                className="rounded-lg border-2 border-dashed border-border bg-background relative"
                style={{ height: '160px', touchAction: 'none' }}
              >
                <SignatureCanvas
                  ref={(ref) => { sigPadRef.current = ref; }}
                  penColor="#1a1a1a"
                  backgroundColor="#ffffff"
                  minWidth={1.5}
                  maxWidth={3}
                  canvasProps={{
                    className: 'w-full h-full rounded-lg',
                    style: { touchAction: 'none' },
                  }}
                  onBegin={() => setSignError('')}
                />
              </div>
              <button
                type="button"
                onClick={() => sigPadRef.current?.clear()}
                className="mt-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Unterschrift löschen
              </button>
            </div>

            {signError && (
              <p className="text-sm text-destructive">{signError}</p>
            )}

            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="w-full h-12 text-base"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              {acceptMutation.isPending ? 'Wird gesendet…' : 'Annehmen & Unterschreiben'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Mit Ihrer Unterschrift bestätigen Sie die Annahme dieses Dokuments.
            </p>
          </div>
        )}

        {/* Non-signable info */}
        {!isSignable && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">Dieses Dokument dient zur Ansicht.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    </div>
  );
};

export default PublicDocumentView;
