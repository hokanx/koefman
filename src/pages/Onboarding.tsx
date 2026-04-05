import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Building2, Receipt, FileText, Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2,
  Droplets, Wrench, BriefcaseBusiness, HeadsetIcon, Globe, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

const TOTAL_STEPS = 7;

interface ServiceItem {
  name: string;
  price: string;
}

type IndustryKey = 'cleaning' | 'garage' | 'consulting' | 'service' | 'web' | 'general';

interface IndustryOption {
  key: IndustryKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const INDUSTRIES: IndustryOption[] = [
  { key: 'cleaning', label: 'Gebäudereinigung', description: 'Reinigung, Hausmeister, Facility', icon: <Droplets className="h-5 w-5" /> },
  { key: 'garage', label: 'Kfz / Werkstatt', description: 'Reparatur, Wartung, Service', icon: <Wrench className="h-5 w-5" /> },
  { key: 'consulting', label: 'Beratung', description: 'Coaching, Consulting, Agentur', icon: <BriefcaseBusiness className="h-5 w-5" /> },
  { key: 'service', label: 'Kundenservice / Termine', description: 'Dienstleistung, Termine, Support', icon: <HeadsetIcon className="h-5 w-5" /> },
  { key: 'web', label: 'Website / Domain / Betreuung', description: 'Webdesign, Hosting, IT', icon: <Globe className="h-5 w-5" /> },
  { key: 'general', label: 'Sonstiges', description: 'Andere Branche', icon: <MoreHorizontal className="h-5 w-5" /> },
];

const INDUSTRY_DEFAULTS: Record<IndustryKey, {
  services: ServiceItem[];
  offerIntro: string;
  offerFooter: string;
  invoiceIntro: string;
  invoiceFooter: string;
  closingText: string;
}> = {
  cleaning: {
    services: [
      { name: 'Unterhaltsreinigung', price: '35' },
      { name: 'Grundreinigung', price: '120' },
      { name: 'Fensterreinigung', price: '50' },
    ],
    offerIntro: 'Sehr geehrte Damen und Herren,\n\ngerne bieten wir Ihnen die folgenden Reinigungsleistungen an:',
    offerFooter: 'Dieses Angebot ist 14 Tage gültig.',
    invoiceIntro: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Reinigungsleistungen erlauben wir uns, wie folgt abzurechnen:',
    invoiceFooter: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    closingText: 'Mit freundlichen Grüßen',
  },
  garage: {
    services: [
      { name: 'Inspektion', price: '149' },
      { name: 'Ölwechsel', price: '69' },
      { name: 'Reifenwechsel (4 Reifen)', price: '40' },
    ],
    offerIntro: 'Sehr geehrte Damen und Herren,\n\ngerne bieten wir Ihnen die folgenden Werkstattleistungen an:',
    offerFooter: 'Dieses Angebot ist 14 Tage gültig.',
    invoiceIntro: 'Sehr geehrte Damen und Herren,\n\nfür die durchgeführten Arbeiten an Ihrem Fahrzeug erlauben wir uns, wie folgt abzurechnen:',
    invoiceFooter: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    closingText: 'Mit freundlichen Grüßen',
  },
  consulting: {
    services: [
      { name: 'Beratungsstunde', price: '120' },
      { name: 'Workshop (halber Tag)', price: '450' },
      { name: 'Projektpauschale', price: '1500' },
    ],
    offerIntro: 'Sehr geehrte Damen und Herren,\n\ngerne unterbreiten wir Ihnen folgendes Angebot für unsere Beratungsleistungen:',
    offerFooter: 'Dieses Angebot ist 14 Tage gültig.',
    invoiceIntro: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Beratungsleistungen stellen wir Ihnen wie folgt in Rechnung:',
    invoiceFooter: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    closingText: 'Mit freundlichen Grüßen',
  },
  service: {
    services: [
      { name: 'Servicepauschale', price: '50' },
      { name: 'Termingebühr', price: '30' },
    ],
    offerIntro: 'Sehr geehrte Damen und Herren,\n\ngerne bieten wir Ihnen folgende Dienstleistungen an:',
    offerFooter: 'Dieses Angebot ist 14 Tage gültig.',
    invoiceIntro: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Dienstleistungen erlauben wir uns, wie folgt abzurechnen:',
    invoiceFooter: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    closingText: 'Mit freundlichen Grüßen',
  },
  web: {
    services: [
      { name: 'Website-Erstellung', price: '1200' },
      { name: 'Monatliche Betreuung', price: '99' },
      { name: 'Domain & Hosting (jährlich)', price: '120' },
    ],
    offerIntro: 'Sehr geehrte Damen und Herren,\n\ngerne bieten wir Ihnen folgende Leistungen im Bereich Web & IT an:',
    offerFooter: 'Dieses Angebot ist 14 Tage gültig.',
    invoiceIntro: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen im Bereich Web & IT erlauben wir uns, wie folgt abzurechnen:',
    invoiceFooter: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    closingText: 'Mit freundlichen Grüßen',
  },
  general: {
    services: [
      { name: '', price: '' },
    ],
    offerIntro: 'Sehr geehrte Damen und Herren,\n\nwir bieten Ihnen die nachfolgend aufgeführten Leistungen zu den genannten Konditionen an:',
    offerFooter: 'Dieses Angebot ist 14 Tage gültig.',
    invoiceIntro: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen erlauben wir uns, wie folgt abzurechnen:',
    invoiceFooter: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
    closingText: 'Mit freundlichen Grüßen',
  },
};

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2 — Branche
  const [industry, setIndustry] = useState<IndustryKey>('general');

  // Step 3 — Unternehmen
  const [business, setBusiness] = useState({
    business_name: '',
    owner_name: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    email: '',
    phone: '',
  });

  // Step 4 — Steuern
  const [taxMode, setTaxMode] = useState<'klein' | 'ust'>('klein');
  const [taxRate, setTaxRate] = useState('19');

  // Step 5 — Rechnungen
  const [payment, setPayment] = useState({
    payment_terms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    iban: '',
    bic: '',
    bank_name: '',
  });

  // Step 6 — Leistungen (seeded from industry)
  const [services, setServices] = useState<ServiceItem[]>([{ name: '', price: '' }]);
  const [servicesSynced, setServicesSynced] = useState(false);

  const progress = (step / TOTAL_STEPS) * 100;

  const next = () => {
    const nextStep = Math.min(step + 1, TOTAL_STEPS);
    // Seed services from industry defaults when entering step 6
    if (nextStep === 6 && !servicesSynced) {
      const defaults = INDUSTRY_DEFAULTS[industry];
      if (defaults.services.length > 0 && defaults.services[0].name) {
        setServices(defaults.services.map(s => ({ ...s })));
      }
      setServicesSynced(true);
    }
    setStep(nextStep);
  };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const isKlein = taxMode === 'klein';
      const defaults = INDUSTRY_DEFAULTS[industry];
      const kleinFooter = isKlein ? '\n\nGemäß §19 UStG wird keine Umsatzsteuer berechnet.' : '';

      const { error: settingsError } = await supabase
        .from('business_settings')
        .upsert({
          user_id: user.id,
          business_name: business.business_name,
          owner_name: business.owner_name,
          street: business.street,
          house_number: business.house_number,
          postal_code: business.postal_code,
          city: business.city,
          country: 'Deutschland',
          email: business.email,
          phone: business.phone,
          small_business_regulation: isKlein,
          default_tax_rate: isKlein ? 0 : Number(taxRate) || 19,
          payment_terms: payment.payment_terms,
          iban: payment.iban,
          bic: payment.bic,
          bank_name: payment.bank_name,
          account_holder: business.owner_name,
          business_category: industry,
          default_offer_intro_text: defaults.offerIntro,
          default_offer_footer_text: defaults.offerFooter + kleinFooter,
          default_invoice_intro_text: defaults.invoiceIntro,
          default_invoice_footer_text: defaults.invoiceFooter,
          default_closing_text: defaults.closingText,
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

      // Auto-create organization + membership for single-business model
      const { data: existingMembership } = await supabase
        .from('organization_memberships')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMembership) {
        const orgSlug = (business.business_name || 'business')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: business.business_name || 'Mein Geschäft',
            slug: orgSlug,
            owner_user_id: user.id,
            tax_mode: isKlein ? 'small_business' : 'standard',
          })
          .select('id')
          .single();
        if (orgError) throw orgError;

        const { error: memError } = await supabase
          .from('organization_memberships')
          .insert({
            organization_id: newOrg.id,
            user_id: user.id,
            role: 'owner',
          });
        if (memError) throw memError;
      }

      // Save service templates
      const validServices = services.filter((s) => s.name.trim());
      for (const svc of validServices) {
        const { data: tmpl, error: tmplError } = await supabase
          .from('service_templates')
          .insert({ user_id: user.id, template_name: svc.name.trim() })
          .select('id')
          .single();

        if (tmplError) throw tmplError;

        const price = parseFloat(svc.price.replace(',', '.')) || 0;
        await supabase.from('service_template_items').insert({
          template_id: tmpl.id,
          title: svc.name.trim(),
          quantity: 1,
          unit_price: price,
          tax_rate: isKlein ? 0 : Number(taxRate) || 19,
          total: price,
          unit: 'Stück',
          sort_order: 0,
        });
      }

      toast.success('Einrichtung abgeschlossen!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error('Fehler beim Speichern: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setSaving(false);
    }
  };

  const addService = () => {
    if (services.length < 5) setServices([...services, { name: '', price: '' }]);
  };

  const removeService = (i: number) => {
    setServices(services.filter((_, idx) => idx !== i));
  };

  const updateService = (i: number, field: keyof ServiceItem, value: string) => {
    const copy = [...services];
    copy[i] = { ...copy[i], [field]: value };
    setServices(copy);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Progress */}
      {step > 1 && step < TOTAL_STEPS && (
        <div className="px-4 pt-4">
          <Progress value={progress} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Schritt {step} von {TOTAL_STEPS}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">

          {/* STEP 1 — Willkommen */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Willkommen bei KÖFMAN</h1>
                <p className="mt-2 text-muted-foreground">
                  In wenigen Schritten richten wir alles für dich ein – damit du sofort loslegen kannst.
                </p>
              </div>
              <Button onClick={next} className="w-full" size="lg">
                Loslegen <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 — Branche */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">Was passt am besten zu Ihrem Unternehmen?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Wir passen die Einrichtung an Ihre Branche an.</p>
              </div>

              <div className="space-y-2">
                {INDUSTRIES.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIndustry(opt.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                      industry === opt.key
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-accent'
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      industry === opt.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {opt.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {industry === opt.key && (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prev} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
                </Button>
                <Button onClick={next} className="flex-1">
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Unternehmen */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Dein Unternehmen</h2>
                  <p className="text-sm text-muted-foreground">Grunddaten für Dokumente</p>
                </div>
              </div>

              <div className="space-y-3">
                <Input placeholder="Firmenname *" value={business.business_name} onChange={(e) => setBusiness({ ...business, business_name: e.target.value })} />
                <Input placeholder="Inhaber / Name" value={business.owner_name} onChange={(e) => setBusiness({ ...business, owner_name: e.target.value })} />
                <div className="flex gap-2">
                  <Input placeholder="Straße" className="flex-1" value={business.street} onChange={(e) => setBusiness({ ...business, street: e.target.value })} />
                  <Input placeholder="Nr." className="w-20" value={business.house_number} onChange={(e) => setBusiness({ ...business, house_number: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Input placeholder="PLZ" className="w-28" value={business.postal_code} onChange={(e) => setBusiness({ ...business, postal_code: e.target.value })} />
                  <Input placeholder="Ort" className="flex-1" value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} />
                </div>
                <Input type="email" placeholder="E-Mail" value={business.email} onChange={(e) => setBusiness({ ...business, email: e.target.value })} />
                <Input type="tel" placeholder="Telefon" value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prev} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
                </Button>
                <Button onClick={next} className="flex-1" disabled={!business.business_name.trim()}>
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 — Steuern */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Steuereinstellungen</h2>
                  <p className="text-sm text-muted-foreground">Wie rechnest du ab?</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setTaxMode('klein')}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    taxMode === 'klein'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  <p className="font-medium text-foreground">Kleinunternehmer</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keine Umsatzsteuer gemäß §19 UStG
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTaxMode('ust')}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    taxMode === 'ust'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  <p className="font-medium text-foreground">Umsatzsteuer aktiv</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reguläre Umsatzsteuer ausweisen
                  </p>
                </button>

                {taxMode === 'ust' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">Steuersatz:</label>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prev} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
                </Button>
                <Button onClick={next} className="flex-1">
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5 — Rechnungen */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Zahlungsdaten</h2>
                  <p className="text-sm text-muted-foreground">Für deine Rechnungen</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Zahlungsziel</label>
                  <Input
                    value={payment.payment_terms}
                    onChange={(e) => setPayment({ ...payment, payment_terms: e.target.value })}
                    placeholder="z.B. Zahlbar innerhalb von 14 Tagen"
                  />
                </div>
                <Input placeholder="IBAN" value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} />
                <div className="flex gap-2">
                  <Input placeholder="BIC (optional)" className="flex-1" value={payment.bic} onChange={(e) => setPayment({ ...payment, bic: e.target.value })} />
                  <Input placeholder="Bank (optional)" className="flex-1" value={payment.bank_name} onChange={(e) => setPayment({ ...payment, bank_name: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prev} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
                </Button>
                <Button onClick={next} className="flex-1">
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6 — Leistungen */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Deine Leistungen</h2>
                  <p className="text-sm text-muted-foreground">
                    {industry !== 'general'
                      ? 'Wir haben Vorschläge für Ihre Branche vorbereitet – passen Sie diese gerne an.'
                      : 'Erstelle Vorlagen für häufige Leistungen'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {services.map((svc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Bezeichnung"
                      className="flex-1"
                      value={svc.name}
                      onChange={(e) => updateService(i, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Preis €"
                      className="w-24"
                      value={svc.price}
                      onChange={(e) => updateService(i, 'price', e.target.value)}
                    />
                    {services.length > 1 && (
                      <button type="button" onClick={() => removeService(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                {services.length < 5 && (
                  <Button variant="outline" size="sm" onClick={addService} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Leistung hinzufügen
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Du kannst diesen Schritt überspringen und später Vorlagen anlegen.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prev} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
                </Button>
                <Button onClick={next} className="flex-1">
                  Weiter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7 — Abschluss */}
          {step === 7 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Alles bereit!</h2>
                <p className="mt-2 text-muted-foreground">
                  Deine Einstellungen werden gespeichert. Du kannst sie jederzeit in den Einstellungen anpassen.
                </p>
              </div>

              <Button onClick={handleFinish} className="w-full" size="lg" disabled={saving}>
                {saving ? 'Wird gespeichert…' : 'Jetzt starten'} {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <Button variant="ghost" onClick={prev} size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Onboarding;
