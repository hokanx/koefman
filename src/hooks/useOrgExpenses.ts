import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ExpenseCategory =
  | 'software'
  | 'werbung'
  | 'buerobedarf'
  | 'fahrtkosten'
  | 'beratung'
  | 'subunternehmer'
  | 'hosting'
  | 'sonstiges';

export type ExportStatus = 'open' | 'reviewed' | 'exported' | 'archived';

export interface OrgExpense {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  created_by_user_id: string | null;
  expense_date: string;
  booking_date: string | null;
  vendor_name: string;
  description: string | null;
  category: ExpenseCategory;
  amount_net: number | null;
  amount_tax: number | null;
  amount_gross: number;
  currency: string;
  receipt_file_url: string | null;
  receipt_file_name: string | null;
  linked_document_id: string | null;
  notes: string | null;
  export_status: ExportStatus;
}

// --- Labels ---

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'software', label: 'Software' },
  { value: 'werbung', label: 'Werbung' },
  { value: 'buerobedarf', label: 'Bürobedarf' },
  { value: 'fahrtkosten', label: 'Fahrtkosten' },
  { value: 'beratung', label: 'Beratung' },
  { value: 'subunternehmer', label: 'Subunternehmer' },
  { value: 'hosting', label: 'Hosting / Domains' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export const EXPORT_STATUSES: { value: ExportStatus; label: string }[] = [
  { value: 'open', label: 'Offen' },
  { value: 'reviewed', label: 'Geprüft' },
  { value: 'exported', label: 'Exportiert' },
  { value: 'archived', label: 'Archiviert' },
];

export const getCategoryLabel = (v: string) =>
  EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export const getExportStatusLabel = (v: string) =>
  EXPORT_STATUSES.find((s) => s.value === v)?.label ?? v;

export const formatEUR = (v: number | null | undefined) =>
  v != null ? v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '–';

// --- Queries ---

export const useOrgExpenseList = (filters?: { category?: ExpenseCategory; exportStatus?: ExportStatus }) => {
  const { activeOrganizationId } = useWorkspace();
  return useQuery({
    queryKey: ['org-expenses', activeOrganizationId, filters?.category, filters?.exportStatus],
    queryFn: async () => {
      let query = supabase
        .from('org_expenses' as any)
        .select('*')
        .eq('organization_id', activeOrganizationId!)
        .order('expense_date', { ascending: false });
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.exportStatus) query = query.eq('export_status', filters.exportStatus);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as OrgExpense[];
    },
    enabled: !!activeOrganizationId,
  });
};

// --- Mutations ---

export const useCreateOrgExpense = () => {
  const { activeOrganizationId } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      expense_date: string;
      vendor_name: string;
      description?: string;
      category: ExpenseCategory;
      amount_gross: number;
      amount_net?: number;
      amount_tax?: number;
      notes?: string;
      receipt_file_url?: string;
      receipt_file_name?: string;
      linked_document_id?: string;
    }) => {
      if (!activeOrganizationId) throw new Error('Kein aktives Geschäft');
      const { data, error } = await supabase
        .from('org_expenses' as any)
        .insert({
          organization_id: activeOrganizationId,
          created_by_user_id: user?.id ?? null,
          expense_date: input.expense_date,
          vendor_name: input.vendor_name,
          description: input.description ?? null,
          category: input.category,
          amount_gross: input.amount_gross,
          amount_net: input.amount_net ?? null,
          amount_tax: input.amount_tax ?? null,
          notes: input.notes ?? null,
          receipt_file_url: input.receipt_file_url ?? null,
          receipt_file_name: input.receipt_file_name ?? null,
          linked_document_id: input.linked_document_id ?? null,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as OrgExpense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-expenses'] });
      toast.success('Ausgabe erstellt');
    },
    onError: (err: any) => toast.error(err.message || 'Fehler beim Erstellen'),
  });
};

export const useUpdateOrgExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrgExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('org_expenses' as any)
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as OrgExpense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-expenses'] });
      toast.success('Ausgabe aktualisiert');
    },
    onError: (err: any) => toast.error(err.message || 'Fehler beim Aktualisieren'),
  });
};

export const useDeleteOrgExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_expenses' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-expenses'] });
      toast.success('Ausgabe gelöscht');
    },
    onError: (err: any) => toast.error(err.message || 'Fehler beim Löschen'),
  });
};
