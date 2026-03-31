import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import SignaturePad from 'react-signature-canvas';
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
  const sigPadRef = useRef<SignaturePad | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signError, setSignError] = useState('');

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

  const { data: acceptance } = useQuery({
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
      if (!sigCanvas || sigCanvas.isEmpty()) throw new Error('Bitte unterschreiben Sie.');

      const signatureImage = sigCanvas.toDataURL('image/png');

      // Insert acceptance
      const { error: acceptError } = await supabase
        .from('org_document_acceptances' as any)
        .insert({
          document_id: doc.id,
          accepted_by_name: signerName.trim(),
          signature_image: signatureImage,
        } as any);
      if (acceptError) throw acceptError;

      // Update document status
      const { error: updateError } = await supabase
        .from('org_documents' as any)
        .update({ status: 'accepted' } as any)
        .eq('id', doc.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-org-document', token] });
      queryClient.invalidateQueries({ queryKey: ['public-org-doc-acceptance', doc?.id] });
      toast.success('Dokument erfolgreich angenommen');
    },
    onError: (err: any) => {
      setSignError(err.message || 'Fehler');
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
  const isAccepted = doc.status === 'accepted' || !!acceptance;
  const payload = doc.document_payload_json ?? {};
  const amountFormatted = doc.amount_total != null && doc.amount_total > 0
    ? Number(doc.amount_total).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
    : null;

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

        {/* Recipient info */}
        {doc.recipient_name && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <span className="text-muted-foreground">Empfänger: </span>
            <span className="font-medium text-foreground">{doc.recipient_name}</span>
          </div>
        )}

        {/* Acceptance status */}
        {isAccepted && (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
            <CheckCircle className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Dokument angenommen</h2>
            {acceptance?.accepted_by_name && (
              <p className="text-sm text-muted-foreground">
                Unterschrieben von: {acceptance.accepted_by_name}
              </p>
            )}
            {acceptance?.signature_image && (
              <div className="mx-auto mt-2 max-w-xs">
                <img src={acceptance.signature_image} alt="Unterschrift" className="border border-border rounded" />
              </div>
            )}
          </div>
        )}

        {/* Signing form */}
        {isSignable && !isAccepted && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Dokument annehmen & unterschreiben</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Ihr Name</label>
              <Input
                value={signerName}
                onChange={(e) => { setSignerName(e.target.value); setSignError(''); }}
                placeholder="Vor- und Nachname"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Unterschrift</label>
              <div className="rounded-lg border border-border bg-background">
                <SignaturePad
                  ref={(ref) => { sigPadRef.current = ref; }}
                  canvasProps={{ className: 'w-full h-40' }}
                  onBegin={() => setSignError('')}
                />
              </div>
              <button
                type="button"
                onClick={() => sigPadRef.current?.clear()}
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
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
              className="w-full"
            >
              {acceptMutation.isPending ? 'Wird gesendet…' : 'Annehmen & Unterschreiben'}
            </Button>
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
