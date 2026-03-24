import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import { toast } from 'sonner';
import type { CustomerType } from '@/types';

const CustomerNew = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    customer_type: 'private' as CustomerType,
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('customers').insert({
        ...form,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-count'] });
      toast.success(t.common.success);
      navigate('/customers');
    },
    onError: () => toast.error(t.common.error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    mutation.mutate();
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>

      <h2 className="mb-6 text-xl font-bold text-foreground">{t.customers.newCustomer}</h2>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <FormSection title={t.customers.customerDetails}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.customerType}</label>
            <select
              value={form.customer_type}
              onChange={(e) => update('customer_type', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="private">{t.customers.private}</option>
              <option value="business">{t.customers.business}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.name} *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.contactPerson}</label>
            <input
              type="text"
              value={form.contact_person}
              onChange={(e) => update('contact_person', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.phone}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.email}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.address}</label>
            <textarea
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.notes}</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>
        </FormSection>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent md:flex-none md:px-6"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 md:flex-none md:px-6"
          >
            {mutation.isPending ? t.common.loading : t.customers.saveCustomer}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerNew;
