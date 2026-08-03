import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FormSection from '@/components/shared/FormSection';
import CustomerExtensionFields from '@/components/shared/CustomerExtensionFields';
import { toast } from 'sonner';
import type { CustomerType } from '@/types';

const CustomerEdit = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '', customer_type: 'private' as CustomerType, contact_person: '',
    phone: '', email: '', street: '', house_number: '', postal_code: '', city: '', country: '', notes: '',
  });
  const [ext, setExt] = useState({
    vehicle_plate: '', vehicle_brand: '', vehicle_model: '', repair_notes: '',
    property_size: '', cleaning_frequency: '', service_location: '', service_notes: '',
    business_category: 'general',
  });

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: extension } = useQuery({
    queryKey: ['customer-extension', id],
    queryFn: async () => {
      const { data } = await supabase.from('customer_extensions').select('*').eq('customer_id', id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('business_category').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name, customer_type: customer.customer_type as CustomerType,
        contact_person: customer.contact_person || '', phone: customer.phone || '',
        email: customer.email || '',
        street: customer.street || '', house_number: customer.house_number || '',
        postal_code: customer.postal_code || '', city: customer.city || '',
        country: customer.country || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  useEffect(() => {
    if (extension) {
      setExt({
        vehicle_plate: extension.vehicle_plate || '', vehicle_brand: extension.vehicle_brand || '',
        vehicle_model: extension.vehicle_model || '', repair_notes: extension.repair_notes || '',
        property_size: extension.property_size || '', cleaning_frequency: extension.cleaning_frequency || '',
        service_location: extension.service_location || '', service_notes: extension.service_notes || '',
        business_category: extension.business_category || settings?.business_category || 'general',
      });
    } else if (settings) {
      setExt((prev) => ({ ...prev, business_category: settings.business_category || 'general' }));
    }
  }, [extension, settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const address = [
        [form.street, form.house_number].filter(Boolean).join(' '),
        [form.postal_code, form.city].filter(Boolean).join(' '),
        form.country,
      ].filter(Boolean).join('\n');

      const { error } = await supabase.from('customers').update({
        name: form.name, customer_type: form.customer_type, contact_person: form.contact_person,
        phone: form.phone, email: form.email, address, notes: form.notes,
        street: form.street, house_number: form.house_number, postal_code: form.postal_code,
        city: form.city, country: form.country,
      }).eq('id', id!);
      if (error) throw error;
      const category = ext.business_category;
      if (category !== 'general') {
        const extData = { customer_id: id!, business_category: category, ...ext };
        if (extension) {
          await supabase.from('customer_extensions').update(extData).eq('id', extension.id);
        } else {
          await supabase.from('customer_extensions').insert(extData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-extension', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(t.common.updated);
      navigate(`/customers/${id}`);
    },
    onError: () => toast.error(t.common.error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    mutation.mutate();
  };

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const category = ext.business_category;
  const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="animate-fade-in p-4 md:p-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t.common.back}
      </button>
      <h2 className="mb-6 text-xl font-bold text-foreground">{t.customers.editCustomer}</h2>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <FormSection title={t.customers.customerDetails}>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.customerType}</label>
            <select value={form.customer_type} onChange={(e) => update('customer_type', e.target.value)} className={inputClass}>
              <option value="private">{t.customers.private}</option>
              <option value="business">{t.customers.business}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.name} *</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.contactPerson}</label>
            <input type="text" value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.phone}</label>
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.email}</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
          </div>
        </FormSection>

        <FormSection title={t.customers.address}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">{t.customers.street}</label>
              <input type="text" value={form.street} onChange={(e) => update('street', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.customers.houseNumber}</label>
              <input type="text" value={form.house_number} onChange={(e) => update('house_number', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.customers.postalCode}</label>
              <input type="text" value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">{t.customers.city}</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">{t.customers.country}</label>
            <input type="text" value={form.country} onChange={(e) => update('country', e.target.value)} className={inputClass} />
          </div>
        </FormSection>

        <FormSection title={t.customers.notes}>
          <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2}
            className={`${inputClass} resize-none`} />
        </FormSection>

        {category !== 'general' && (
          <FormSection title={t.common.extensionFields}>
            <CustomerExtensionFields category={category} ext={ext} setExt={setExt} />
          </FormSection>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent md:flex-none md:px-6">
            {t.common.cancel}
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 md:flex-none md:px-6">
            {mutation.isPending ? t.common.loading : t.common.update}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerEdit;
