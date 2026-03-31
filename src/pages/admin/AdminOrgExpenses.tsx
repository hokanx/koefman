import { useState, useRef } from 'react';
import { Receipt, Plus, Trash2, Filter, Search, Paperclip, Eye, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useOrgExpenseList,
  useCreateOrgExpense,
  useDeleteOrgExpense,
  useUpdateOrgExpense,
  EXPENSE_CATEGORIES,
  EXPORT_STATUSES,
  getCategoryLabel,
  getExportStatusLabel,
  formatEUR,
  type ExpenseCategory,
  type ExportStatus,
  type OrgExpense,
} from '@/hooks/useOrgExpenses';
import { formatDateDE } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const EXPORT_BADGE_MAP: Record<string, any> = {
  open: 'open',
  reviewed: 'reviewed',
  exported: 'accepted',
  archived: 'archived',
};

const AdminOrgExpenses = () => {
  const { activeOrganization, activeOrganizationId } = useWorkspace();
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | undefined>();
  const [filterExport, setFilterExport] = useState<ExportStatus | undefined>();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<OrgExpense | null>(null);

  // Create form
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    vendor_name: '',
    description: '',
    category: 'sonstiges' as ExpenseCategory,
    amount_gross: '',
    amount_net: '',
    amount_tax: '',
    notes: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: expenses = [], isLoading } = useOrgExpenseList({ category: filterCategory, exportStatus: filterExport });
  const createMutation = useCreateOrgExpense();
  const deleteMutation = useDeleteOrgExpense();
  const updateMutation = useUpdateOrgExpense();

  if (!activeOrganizationId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Receipt className="h-10 w-10" />
        <p className="text-sm">Bitte wählen Sie zuerst einen Workspace aus.</p>
      </div>
    );
  }

  const filtered = expenses.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.vendor_name?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s)
    );
  });

  const parseNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? undefined : n;
  };

  const resetForm = () => {
    setForm({
      expense_date: new Date().toISOString().slice(0, 10),
      vendor_name: '',
      description: '',
      category: 'sonstiges',
      amount_gross: '',
      amount_net: '',
      amount_tax: '',
      notes: '',
    });
    setReceiptFile(null);
  };

  const handleCreate = async () => {
    const gross = parseNum(form.amount_gross);
    if (!form.vendor_name.trim() || gross == null || gross <= 0) {
      toast.error('Lieferant und Bruttobetrag sind erforderlich.');
      return;
    }

    let receiptUrl: string | undefined;
    let receiptName: string | undefined;

    if (receiptFile) {
      setUploading(true);
      try {
        const ext = receiptFile.name.split('.').pop();
        const path = `${activeOrganizationId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('client-documents').upload(path, receiptFile);
        if (error) throw error;
        receiptUrl = path;
        receiptName = receiptFile.name;
      } catch (err: any) {
        toast.error('Upload fehlgeschlagen: ' + (err.message || ''));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    createMutation.mutate(
      {
        expense_date: form.expense_date,
        vendor_name: form.vendor_name.trim(),
        description: form.description || undefined,
        category: form.category,
        amount_gross: gross,
        amount_net: parseNum(form.amount_net),
        amount_tax: parseNum(form.amount_tax),
        notes: form.notes || undefined,
        receipt_file_url: receiptUrl,
        receipt_file_name: receiptName,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          resetForm();
        },
      }
    );
  };

  const handleStatusChange = (expense: OrgExpense, newStatus: ExportStatus) => {
    updateMutation.mutate({ id: expense.id, export_status: newStatus } as any);
    if (selectedExpense?.id === expense.id) {
      setSelectedExpense({ ...expense, export_status: newStatus });
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Ausgaben</h1>
          {activeOrganization && (
            <p className="text-sm text-muted-foreground">{activeOrganization.name}</p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-1 h-4 w-4" /> Neue Ausgabe
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Datum *</label>
              <Input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Lieferant *</label>
              <Input value={form.vendor_name} onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))} placeholder="z.B. Hetzner, Google Ads" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Brutto *</label>
              <Input value={form.amount_gross} onChange={(e) => setForm((f) => ({ ...f, amount_gross: e.target.value }))} placeholder="0,00" inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Netto (optional)</label>
              <Input value={form.amount_net} onChange={(e) => setForm((f) => ({ ...f, amount_net: e.target.value }))} placeholder="0,00" inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">USt (optional)</label>
              <Input value={form.amount_tax} onChange={(e) => setForm((f) => ({ ...f, amount_tax: e.target.value }))} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Beschreibung</label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Was wurde bezahlt…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notizen</label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Interne Notizen…" />
          </div>

          {/* Receipt upload */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Beleg anhängen</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition">
              <Upload className="h-4 w-4" />
              {receiptFile ? receiptFile.name : 'PDF oder Bild auswählen'}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || uploading}>
              {uploading ? 'Upload…' : createMutation.isPending ? 'Wird erstellt…' : 'Ausgabe erstellen'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Lieferant / Beschreibung suchen…" className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <button onClick={() => setFilterCategory(undefined)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${!filterCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>Alle Kategorien</button>
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCategory(c.value)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${filterCategory === c.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{c.label}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setFilterExport(undefined)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${!filterExport ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>Alle Status</button>
          {EXPORT_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setFilterExport(s.value)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${filterExport === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Expense list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Receipt className="h-10 w-10" />
          <p className="text-sm">Keine Ausgaben vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition cursor-pointer"
              onClick={() => setSelectedExpense(exp)}
            >
              <Receipt className="h-7 w-7 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{exp.vendor_name || '–'}</p>
                  <span className="text-sm font-semibold text-foreground">{formatEUR(exp.amount_gross)}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{getCategoryLabel(exp.category)}</span>
                  <StatusBadge status={EXPORT_BADGE_MAP[exp.export_status] ?? 'open'} label={getExportStatusLabel(exp.export_status)} />
                  <span className="text-[10px] text-muted-foreground">{formatDateDE(exp.expense_date)}</span>
                  {exp.receipt_file_url && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary">
                      <Paperclip className="h-2.5 w-2.5" /> Beleg
                    </span>
                  )}
                </div>
                {exp.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{exp.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setSelectedExpense(exp)} className="rounded-md p-2 text-muted-foreground hover:text-primary" title="Details"><Eye className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm('Ausgabe wirklich löschen?')) deleteMutation.mutate(exp.id); }} className="rounded-md p-2 text-muted-foreground hover:text-destructive" title="Löschen"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => { if (!open) setSelectedExpense(null); }}>
        <DialogContent className="max-w-lg">
          {selectedExpense && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  {selectedExpense.vendor_name || '–'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm font-medium text-muted-foreground">
                {getCategoryLabel(selectedExpense.category)} · {formatDateDE(selectedExpense.expense_date)} · {formatEUR(selectedExpense.amount_gross)}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedExpense.amount_net != null && (
                  <div><span className="text-xs text-muted-foreground">Netto</span><p className="font-medium">{formatEUR(selectedExpense.amount_net)}</p></div>
                )}
                {selectedExpense.amount_tax != null && (
                  <div><span className="text-xs text-muted-foreground">USt</span><p className="font-medium">{formatEUR(selectedExpense.amount_tax)}</p></div>
                )}
                <div><span className="text-xs text-muted-foreground">Brutto</span><p className="font-medium">{formatEUR(selectedExpense.amount_gross)}</p></div>
                {selectedExpense.booking_date && (
                  <div><span className="text-xs text-muted-foreground">Buchungsdatum</span><p>{formatDateDE(selectedExpense.booking_date)}</p></div>
                )}
              </div>
              {selectedExpense.description && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Beschreibung</p>
                  <p className="text-sm text-foreground">{selectedExpense.description}</p>
                </div>
              )}
              {selectedExpense.notes && (
                <div className="text-sm text-muted-foreground">{selectedExpense.notes}</div>
              )}
              {selectedExpense.receipt_file_name && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Paperclip className="h-4 w-4" />
                  <span>{selectedExpense.receipt_file_name}</span>
                </div>
              )}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Exportstatus ändern</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPORT_STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(selectedExpense, s.value)}
                      disabled={selectedExpense.export_status === s.value || updateMutation.isPending}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selectedExpense.export_status === s.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      } disabled:opacity-50`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrgExpenses;
