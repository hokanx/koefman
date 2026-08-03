import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RepeatIcon } from 'lucide-react';

interface RecurringSetupModalProps {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  customerId: string;
}

const RecurringSetupModal = ({ open, onClose, invoiceId, customerId }: RecurringSetupModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);

  const calcNextRun = (start: string, freq: string): string => {
    const d = new Date(start);
    switch (freq) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'every_2_weeks': d.setDate(d.getDate() + 14); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    }
    return d.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nextRun = calcNextRun(startDate, frequency);
      const { error } = await supabase.from('recurring_invoices').insert({
        user_id: user.id,
        source_invoice_id: invoiceId,
        customer_id: customerId,
        frequency,
        start_date: startDate,
        next_run_date: nextRun,
        end_date: endDate || null,
        status: 'active',
        auto_generate: autoGenerate,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
      toast.success(t.recurring.created);
      onClose();
    } catch {
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  const rt = t.recurring;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RepeatIcon className="h-5 w-5 text-primary" />
            {rt.setupTitle}
          </DialogTitle>
          <DialogDescription>{rt.setupDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{rt.frequency}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{rt.weekly}</SelectItem>
                <SelectItem value="every_2_weeks">{rt.every2Weeks}</SelectItem>
                <SelectItem value="monthly">{rt.monthly}</SelectItem>
                <SelectItem value="quarterly">{rt.quarterly}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{rt.startDate}</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{rt.endDate}</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="cursor-pointer">{rt.autoGenerate}</Label>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
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

export default RecurringSetupModal;
