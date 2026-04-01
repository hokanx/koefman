import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatEUR } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { generateDocumentNumber } from '@/lib/documentUtils';

interface ContractSetupModalProps {
  open: boolean;
  onClose: () => void;
  offerId: string;
  customerId: string;
  offerNumber: string;
  items: any[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  discount?: {
    type: string | null;
    value: number;
    scope: string;
    duration_months: number | null;
  };
}

const ContractSetupModal = ({ open, onClose, offerId, customerId, offerNumber, items, subtotal, taxTotal, grandTotal, discount }: ContractSetupModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const ct = (t as any).contracts;
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState(ct.defaultTitle);
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Generate contract number
      const { count } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const contractNumber = generateDocumentNumber('VT-', count ?? 0);

      const { data: contract, error } = await supabase.from('contracts').insert({
        user_id: user.id,
        customer_id: customerId,
        source_offer_id: offerId,
        contract_number: contractNumber,
        title,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        status: 'entwurf',
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        discount_type: discount?.type || null,
        discount_value: discount?.value || 0,
        discount_scope: discount?.scope || 'both',
        discount_duration_months: discount?.duration_months ?? null,
      } as any).select().single();
      if (error) throw error;

      // Copy line items
      if (items.length > 0) {
        await supabase.from('contract_items').insert(
          items.map((item: any, i: number) => ({
            contract_id: contract!.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            total: item.total,
            sort_order: i,
          }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(ct.created);
      onClose();
      navigate(`/contracts`);
    } catch {
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {ct.createFromOffer}
          </DialogTitle>
          <DialogDescription>{ct.pdfSubject}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{ct.contractTitle}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{ct.frequency}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{ct.weekly}</SelectItem>
                <SelectItem value="every_2_weeks">{ct.every2Weeks}</SelectItem>
                <SelectItem value="monthly">{ct.monthly}</SelectItem>
                <SelectItem value="quarterly">{ct.quarterly}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{ct.startDate}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{ct.endDate}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm text-muted-foreground">
            <p>{ct.sourceOffer}: <strong className="text-foreground">{offerNumber}</strong></p>
            <p>{ct.services}: <strong className="text-foreground">{items.length}</strong></p>
            <p>{formatEUR(grandTotal)} / {frequency === 'monthly' ? ct.monthly : frequency === 'weekly' ? ct.weekly : frequency === 'every_2_weeks' ? ct.every2Weeks : ct.quarterly}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>{t.common.cancel}</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractSetupModal;
