import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';

import FormSection from '@/components/shared/FormSection';
import { CheckCircle, AlertCircle } from 'lucide-react';
import BrandMark from '@/components/shared/BrandMark';

const IntakeForm = () => {
  const { t } = useLanguage();
  const { token } = useParams<{ token: string }>();

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('general');
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    company_or_name: '', contact_person: '', phone: '', email: '',
    street: '', house_number: '', postal_code: '', city: '', country: '',
    notes: '', service_type: '',
    vehicle_plate: '', vehicle_brand: '', vehicle_model: '', repair_notes: '',
    property_size: '', cleaning_frequency: '', service_location: '', service_notes: '',
  });

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    const resolve = async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('user_id, business_name, business_category')
        .eq('intake_token', token)
        .maybeSingle();
      if (error || !data) { setInvalid(true); setLoading(false); return; }
      setOwnerId(data.user_id);
      setBusinessName(data.business_name || '');
      setBusinessCategory(data.business_category || 'general');
      setLoading(false);
    };
    resolve();
  }, [token]);

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || !form.company_or_name.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('intake_submissions' as any).insert({
        owner_id: ownerId,
        company_or_name: form.company_or_name,
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        street: form.street || null,
        house_number: form.house_number || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        country: form.country || null,
        notes: form.notes || null,
        business_category: businessCategory,
        service_type: form.service_type || null,
        vehicle_plate: form.vehicle_plate || null,
        vehicle_brand: form.vehicle_brand || null,
        vehicle_model: form.vehicle_model || null,
        repair_notes: form.repair_notes || null,
        property_size: form.property_size || null,
        cleaning_frequency: form.cleaning_frequency || null,
        service_location: form.service_location || null,
        service_notes: form.service_notes || null,
        status: 'new',
      } as any);
      if (error) throw error;
      setSubmitted(true);
    } catch {
      alert(t.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-lg font-bold text-foreground">{t.intake.invalidLink}</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">{t.intake.invalidLinkDesc}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <CheckCircle className="mb-4 h-12 w-12 text-[hsl(var(--success))]" />
        <h1 className="text-lg font-bold text-foreground">{t.intake.thankYou}</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{t.intake.thankYouDesc}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <BrandMark variant="wordmark" size="sm" />
      </header>

      <div className="mx-auto max-w-lg p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {businessName ? `${t.intake.title} – ${businessName}` : t.intake.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.intake.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSection title={t.intake.contactInfo}>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.intake.companyOrName} *</label>
              <input type="text" value={form.company_or_name} onChange={e => update('company_or_name', e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.intake.contactPerson}</label>
              <input type="text" value={form.contact_person} onChange={e => update('contact_person', e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.intake.phone}</label>
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.intake.email}</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputClass} />
              </div>
            </div>
          </FormSection>

          <FormSection title={t.intake.addressSection}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-muted-foreground">{t.customers.street}</label>
                <input type="text" value={form.street} onChange={e => update('street', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.customers.houseNumber}</label>
                <input type="text" value={form.house_number} onChange={e => update('house_number', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.customers.postalCode}</label>
                <input type="text" value={form.postal_code} onChange={e => update('postal_code', e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm text-muted-foreground">{t.customers.city}</label>
                <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.customers.country}</label>
              <input type="text" value={form.country} onChange={e => update('country', e.target.value)} className={inputClass} />
            </div>
          </FormSection>

          <FormSection title={t.intake.requestDetails}>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.intake.serviceType}</label>
              <input type="text" value={form.service_type} onChange={e => update('service_type', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">{t.intake.messageNotes}</label>
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </div>
          </FormSection>

          {businessCategory === 'garage' && (
            <FormSection title={t.intake.vehicleInfo}>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.garage.vehiclePlate}</label>
                <input type="text" value={form.vehicle_plate} onChange={e => update('vehicle_plate', e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t.garage.vehicleBrand}</label>
                  <input type="text" value={form.vehicle_brand} onChange={e => update('vehicle_brand', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t.garage.vehicleModel}</label>
                  <input type="text" value={form.vehicle_model} onChange={e => update('vehicle_model', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.garage.repairNotes}</label>
                <textarea value={form.repair_notes} onChange={e => update('repair_notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>
            </FormSection>
          )}

          {businessCategory === 'cleaning' && (
            <FormSection title={t.intake.propertyInfo}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.propertySize}</label>
                  <input type="text" value={form.property_size} onChange={e => update('property_size', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.cleaningFrequency}</label>
                  <input type="text" value={form.cleaning_frequency} onChange={e => update('cleaning_frequency', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.serviceLocation}</label>
                <input type="text" value={form.service_location} onChange={e => update('service_location', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">{t.cleaning.serviceNotes}</label>
                <textarea value={form.service_notes} onChange={e => update('service_notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>
            </FormSection>
          )}

          <button
            type="submit"
            disabled={submitting || !form.company_or_name.trim()}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? t.common.loading : t.intake.submit}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IntakeForm;
