import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type OrgDocumentType = 'offer' | 'invoice' | 'contract' | 'reminder';
export type OrgDocumentStatus = 'draft' | 'generated' | 'sent' | 'accepted' | 'paid' | 'cancelled' | 'archived';

export interface OrgDocument {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  created_by_user_id: string | null;
  document_type: OrgDocumentType;
  status: OrgDocumentStatus;
  title: string;
  document_number: string | null;
  template_id: string | null;
  template_snapshot_json: any;
  document_payload_json: any;
  rendered_content_json: any;
  rendered_html: string | null;
  notes: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  amount_total: number | null;
  currency: string;
}

// --- Labels ---

const DOC_TYPE_LABELS: Record<OrgDocumentType, string> = {
  offer: 'Angebot',
  invoice: 'Rechnung',
  contract: 'Vertrag',
  reminder: 'Mahnung',
};

const STATUS_LABELS: Record<OrgDocumentStatus, string> = {
  draft: 'Entwurf',
  generated: 'Erstellt',
  sent: 'Gesendet',
  accepted: 'Angenommen',
  paid: 'Bezahlt',
  cancelled: 'Storniert',
  archived: 'Archiviert',
};

export const getDocTypeLabel = (t: OrgDocumentType) => DOC_TYPE_LABELS[t] ?? t;
export const getDocStatusLabel = (s: OrgDocumentStatus) => STATUS_LABELS[s] ?? s;

// --- Type-specific status rules ---

const TYPE_STATUSES: Record<OrgDocumentType, OrgDocumentStatus[]> = {
  offer: ['draft', 'sent', 'accepted', 'cancelled', 'archived'],
  invoice: ['draft', 'sent', 'paid', 'cancelled', 'archived'],
  contract: ['draft', 'sent', 'accepted', 'archived'],
  reminder: ['draft', 'sent', 'archived'],
};

export const getStatusesForType = (type: OrgDocumentType): OrgDocumentStatus[] =>
  TYPE_STATUSES[type] ?? ['draft', 'sent', 'archived'];

// --- Type-specific create field config ---

export interface TypeFieldConfig {
  showAmount: boolean;
  amountLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  extraPayloadFields: { key: string; label: string; type: 'date' | 'text'; placeholder: string }[];
}

const TYPE_FIELD_CONFIGS: Record<OrgDocumentType, TypeFieldConfig> = {
  offer: {
    showAmount: true,
    amountLabel: 'Angebotssumme (optional)',
    descriptionLabel: 'Leistungsbeschreibung',
    descriptionPlaceholder: 'Zusammenfassung der angebotenen Leistungen…',
    extraPayloadFields: [],
  },
  invoice: {
    showAmount: true,
    amountLabel: 'Rechnungsbetrag',
    descriptionLabel: 'Leistungsbeschreibung',
    descriptionPlaceholder: 'Zusammenfassung der erbrachten Leistungen…',
    extraPayloadFields: [
      { key: 'due_date', label: 'Fälligkeitsdatum', type: 'date', placeholder: '' },
    ],
  },
  contract: {
    showAmount: false,
    amountLabel: '',
    descriptionLabel: 'Vertragsgegenstand',
    descriptionPlaceholder: 'Umfang und Gegenstand des Vertrags…',
    extraPayloadFields: [
      { key: 'start_date', label: 'Vertragsbeginn', type: 'date', placeholder: '' },
    ],
  },
  reminder: {
    showAmount: true,
    amountLabel: 'Offener Betrag (optional)',
    descriptionLabel: 'Mahngrund',
    descriptionPlaceholder: 'Grund der Mahnung / Bezug zur Rechnung…',
    extraPayloadFields: [
      { key: 'related_invoice', label: 'Bezug Rechnungsnr.', type: 'text', placeholder: 'z.B. RE-2026-001' },
    ],
  },
};

export const getFieldConfigForType = (type: OrgDocumentType): TypeFieldConfig =>
  TYPE_FIELD_CONFIGS[type];

// --- EUR formatting ---

export const formatEUR = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '–';

// --- Document summary line ---

export const getDocSummaryLine = (doc: OrgDocument): string => {
  const parts = [getDocTypeLabel(doc.document_type), getDocStatusLabel(doc.status)];
  if (doc.amount_total != null && doc.amount_total > 0) parts.push(formatEUR(doc.amount_total));
  return parts.join(' · ');
};

/**
 * Fetch all documents for the active organization, with optional type/status filters.
 */
export const useOrgDocumentList = (filters?: { type?: OrgDocumentType; status?: OrgDocumentStatus }) => {
  const { activeOrganizationId } = useWorkspace();

  return useQuery({
    queryKey: ['org-documents', activeOrganizationId, filters?.type, filters?.status],
    queryFn: async () => {
      let query = supabase
        .from('org_documents' as any)
        .select('*')
        .eq('organization_id', activeOrganizationId!)
        .order('created_at', { ascending: false });

      if (filters?.type) query = query.eq('document_type', filters.type);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as OrgDocument[];
    },
    enabled: !!activeOrganizationId,
  });
};

/**
 * Fetch a single document by ID.
 */
export const useOrgDocument = (documentId: string | null) => {
  return useQuery({
    queryKey: ['org-document', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_documents' as any)
        .select('*')
        .eq('id', documentId!)
        .single();
      if (error) throw error;
      return data as unknown as OrgDocument;
    },
    enabled: !!documentId,
  });
};

/**
 * Resolve template + create a new org document with template snapshot.
 */
export const useCreateOrgDocument = () => {
  const { activeOrganizationId } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      document_type: OrgDocumentType;
      title: string;
      recipient_name?: string;
      recipient_email?: string;
      document_payload_json?: any;
      notes?: string;
      amount_total?: number;
    }) => {
      if (!activeOrganizationId) throw new Error('Kein aktiver Workspace');

      // Resolve template
      let templateSnapshot: any = {};
      let templateId: string | null = null;

      // Try org override first, then global
      const { data: orgTemplates } = await supabase
        .from('document_templates' as any)
        .select('*')
        .eq('template_type', input.document_type)
        .eq('scope_type', 'organization')
        .eq('organization_id', activeOrganizationId)
        .eq('is_active', true)
        .order('version_number', { ascending: false })
        .limit(1);

      let resolvedTemplate = (orgTemplates as any)?.[0];

      if (!resolvedTemplate) {
        const { data: globalTemplates } = await supabase
          .from('document_templates' as any)
          .select('*')
          .eq('template_type', input.document_type)
          .eq('scope_type', 'global')
          .is('organization_id', null)
          .eq('is_active', true)
          .order('version_number', { ascending: false })
          .limit(1);
        resolvedTemplate = (globalTemplates as any)?.[0];
      }

      if (resolvedTemplate) {
        templateId = resolvedTemplate.id;
        templateSnapshot = {
          id: resolvedTemplate.id,
          name: resolvedTemplate.name,
          template_type: resolvedTemplate.template_type,
          scope_type: resolvedTemplate.scope_type,
          version_number: resolvedTemplate.version_number,
          content_json: resolvedTemplate.content_json,
          content_html: resolvedTemplate.content_html,
          content_text: resolvedTemplate.content_text,
          snapshot_at: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from('org_documents' as any)
        .insert({
          organization_id: activeOrganizationId,
          created_by_user_id: user?.id ?? null,
          document_type: input.document_type,
          title: input.title,
          template_id: templateId,
          template_snapshot_json: templateSnapshot,
          document_payload_json: input.document_payload_json ?? {},
          recipient_name: input.recipient_name ?? null,
          recipient_email: input.recipient_email ?? null,
          amount_total: input.amount_total ?? 0,
          notes: input.notes ?? null,
          status: 'draft',
        } as any)
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as OrgDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-documents'] });
      toast.success('Dokument erstellt');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fehler beim Erstellen');
    },
  });
};

/**
 * Update an existing org document.
 */
export const useUpdateOrgDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrgDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from('org_documents' as any)
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as OrgDocument;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['org-documents'] });
      queryClient.invalidateQueries({ queryKey: ['org-document', doc.id] });
      toast.success('Dokument aktualisiert');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fehler beim Aktualisieren');
    },
  });
};

/**
 * Delete an org document.
 */
export const useDeleteOrgDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_documents' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-documents'] });
      toast.success('Dokument gelöscht');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Fehler beim Löschen');
    },
  });
};
