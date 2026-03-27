import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, ArrowRight, ArrowLeft, Building2, Wrench, Sparkles, Briefcase, Send } from 'lucide-react';

const INDUSTRIES = [
  { value: 'cleaning', label: 'Gebäudereinigung' },
  { value: 'garage', label: 'Kfz / Werkstatt' },
  { value: 'service', label: 'Dienstleistung' },
  { value: 'trade', label: 'Handwerk' },
  { value: 'general', label: 'Sonstiges' },
];

const SITUATIONS = [
  { value: 'keine-struktur', label: 'Keine Struktur vorhanden' },
  { value: 'chaotisch', label: 'Mache alles selbst – aber chaotisch' },
  { value: 'kompliziert', label: 'Bestehendes System, aber zu kompliziert' },
];

const NEEDS = [
  { value: 'rechnungen', label: 'Rechnungen & Angebote' },
  { value: 'belege', label: 'Belege & Dokumente' },
  { value: 'vertraege', label: 'Verträge' },
  { value: 'steuerberater', label: 'Steuerberater-Vorbereitung' },
  { value: 'website', label: 'Website / Online-Auftritt' },
];

const CONTACT_METHODS = [
  { value: 'telefon', label: 'Telefon' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-Mail' },
];

interface LeadIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadIntakeModal = ({ open, onOpenChange }: LeadIntakeModalProps) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [situation, setSituation] = useState('');
  const [needs, setNeeds] = useState<string[]>([]);
  const [contactMethod, setContactMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const toggleNeed = (v: string) => setNeeds(prev => prev.includes(v) ? prev.filter(n => n !== v) : [...prev, v]);

  const canNext = () => {
    if (step === 1) return name.trim() && company.trim() && industry;
    if (step === 2) return !!situation;
    if (step === 3) return needs.length > 0;
    if (step === 4) return email.trim() && (contactMethod === 'email' || phone.trim());
    return false;
  };

  const handleSubmit = async () => {
    if (!canNext()) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('landing_leads').insert({
        name, company, industry, situation,
        needs, contact_method: contactMethod,
        email, phone: phone || null,
      });
      if (error) throw error;
      setDone(true);
    } catch {
      alert('Fehler beim Senden. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setDone(false); setName(''); setCompany(''); setIndustry('');
    setSituation(''); setNeeds([]); setContactMethod('email'); setEmail(''); setPhone('');
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const optionClass = (selected: boolean) =>
    `w-full text-left rounded-xl border-2 p-4 text-sm font-medium transition-all cursor-pointer ${
      selected
        ? 'border-primary bg-primary/10 text-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
    }`;

  if (done) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-primary mb-4" />
            <h2 className="text-xl font-bold mb-2">Anfrage gesendet!</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Vielen Dank, {name}! Wir melden uns in Kürze bei dir.
            </p>
            <Button className="mt-6" onClick={() => handleClose(false)}>Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {step === 1 && 'Erzähl uns von dir'}
            {step === 2 && 'Wie sieht es bei dir aus?'}
            {step === 3 && 'Wobei brauchst du Unterstützung?'}
            {step === 4 && 'Wie sollen wir dich kontaktieren?'}
          </DialogTitle>
          <div className="flex gap-1.5 pt-2">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label className="text-sm text-muted-foreground">Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Firmenname *</Label>
                <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Deine Firma" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Branche *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button key={ind.value} type="button" onClick={() => setIndustry(ind.value)} className={optionClass(industry === ind.value)}>
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Was trifft am besten auf dich zu?</p>
              {SITUATIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setSituation(s.value)} className={optionClass(situation === s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Wähle alles, was zutrifft:</p>
              {NEEDS.map(n => (
                <button key={n.value} type="button" onClick={() => toggleNeed(n.value)} className={optionClass(needs.includes(n.value))}>
                  {n.label}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Bevorzugte Kontaktart</Label>
                <div className="flex gap-2">
                  {CONTACT_METHODS.map(m => (
                    <button key={m.value} type="button" onClick={() => setContactMethod(m.value)}
                      className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                        contactMethod === m.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">E-Mail *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" className="mt-1" />
              </div>
              {contactMethod !== 'email' && (
                <div>
                  <Label className="text-sm text-muted-foreground">Telefonnummer *</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 ..." className="mt-1" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
            </Button>
          )}
          {step < 4 ? (
            <Button className="flex-1" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
              Weiter <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" disabled={!canNext() || submitting} onClick={handleSubmit}>
              {submitting ? 'Wird gesendet...' : 'Anfrage senden'}
              <Send className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadIntakeModal;
