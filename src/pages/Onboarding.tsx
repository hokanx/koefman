import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Receipt, FileText, Sparkles, ArrowRight, ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

const TOTAL_STEPS = 6;

interface ServiceItem {
  name: string;
  price: string;
}

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 2 — Unternehmen
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

  // Step 3 — Steuern
  const [taxMode, setTaxMode] = useState<'klein' | 'ust'>('klein');
  const [taxRate, setTaxRate] = useState('19');

  // Step 4 — Rechnungen
  const [payment, setPayment] = useState({
    payment_terms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    iban: '',
    bic: '',
    bank_name: '',
  });

  // Step 5 — Leistungen
  const [services, setServices] = useState<ServiceItem[]>([
    { name: '', price: '' },
  ]);

  const progress = (step / TOTAL_STEPS) * 100;

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save business settings
      const isKlein = taxMode === 'klein';
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
          default_offer_intro_text: 'Sehr geehrte Damen und Herren,\n\nwir bieten Ihnen die nachfolgend aufgeführten Leistungen zu den genannten Konditionen an:',
          default_offer_footer_text: isKlein
            ? 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.\n\nDieses Angebot ist 14 Tage gültig.'
            : 'Dieses Angebot ist 14 Tage gültig.',
          default_invoice_intro_text: 'Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen erlauben wir uns, wie folgt abzurechnen:',
          default_invoice_footer_text: 'Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten genannte Konto.',
          default_closing_text: 'Mit freundlichen Grüßen',
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

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

          {/* STEP 2 — Unternehmen */}
          {step === 2 && (
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

          {/* STEP 3 — Steuern */}
          {step === 3 && (
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

          {/* STEP 4 — Rechnungen */}
          {step === 4 && (
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

          {/* STEP 5 — Leistungen */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Deine Leistungen</h2>
                  <p className="text-sm text-muted-foreground">Erstelle Vorlagen für häufige Leistungen</p>
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

          {/* STEP 6 — Abschluss */}
          {step === 6 && (
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
