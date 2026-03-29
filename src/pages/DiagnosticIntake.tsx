import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Answer = string;

interface StepConfig {
  id: string;
  type: 'intro' | 'choice' | 'dynamic' | 'capture' | 'result';
  headline: string;
  subtext?: string;
  options?: { label: string; value: string }[];
  buttonLabel?: string;
}

const steps: StepConfig[] = [
  {
    id: 'start',
    type: 'intro',
    headline: 'WO VERLIERST DU GELD?',
    subtext: '2 MINUTEN. KLARE ANTWORT.',
    buttonLabel: '[ START ]',
  },
  {
    id: 'business_type',
    type: 'choice',
    headline: 'WAS BESCHREIBT DEIN UNTERNEHMEN AM BESTEN?',
    options: [
      { label: 'DIENSTLEISTUNG', value: 'dienstleistung' },
      { label: 'LOKALES GESCHÄFT', value: 'lokal' },
      { label: 'ONLINE BUSINESS', value: 'online' },
      { label: 'ANDERE', value: 'andere' },
    ],
  },
  {
    id: 'inquiries',
    type: 'choice',
    headline: 'BEKOMMST DU KONTINUIERLICH ANFRAGEN?',
    options: [
      { label: 'JA', value: 'ja' },
      { label: 'UNREGELMÄSSIG', value: 'unregelmaessig' },
      { label: 'NEIN', value: 'nein' },
    ],
  },
  {
    id: 'revenue_loss',
    type: 'choice',
    headline: 'WEISST DU GENAU,\nWO DEIN UMSATZ VERLOREN GEHT?',
    options: [
      { label: 'JA', value: 'ja' },
      { label: 'TEILWEISE', value: 'teilweise' },
      { label: 'NEIN', value: 'nein' },
    ],
  },
  {
    id: 'tension',
    type: 'dynamic',
    headline: '', // set dynamically
  },
  {
    id: 'pain_point',
    type: 'choice',
    headline: 'WAS TRIFFT AM EHESTEN AUF DICH ZU?',
    options: [
      { label: 'ZU WENIG QUALIFIZIERTE ANFRAGEN', value: 'wenig_anfragen' },
      { label: 'UNKLARE ABLÄUFE', value: 'unklare_ablaeufe' },
      { label: 'KEINE KLARE CONVERSION-STRUKTUR', value: 'keine_conversion' },
      { label: 'ICH BIN MIR NICHT SICHER', value: 'unsicher' },
    ],
  },
  {
    id: 'capture',
    type: 'capture',
    headline: 'WOHIN SOLLEN WIR DEINE ANALYSE SCHICKEN?',
  },
  {
    id: 'result',
    type: 'result',
    headline: 'DEIN ERGEBNIS IST KLAR.',
  },
];

export default function DiagnosticIntake() {
  const [searchParams] = useSearchParams();
  const variant = searchParams.get('v') || 'direct';
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const step = steps[currentStep];
  const progress = ((currentStep) / (steps.length - 1)) * 100;

  const isWeak = () => {
    return answers.inquiries !== 'ja' || answers.revenue_loss !== 'ja';
  };

  const handleChoice = (value: string) => {
    setAnswers(prev => ({ ...prev, [step.id]: value }));
    setCurrentStep(prev => prev + 1);
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await (supabase as any).from('landing_leads').insert({
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || '',
        industry: answers.business_type || 'unknown',
        situation: `Anfragen: ${answers.inquiries || '-'}, Umsatzverlust: ${answers.revenue_loss || '-'}`,
        needs: [answers.pain_point || 'unknown'],
        contact_method: 'email',
        status: 'neu',
        admin_notes: `QR-Variante: ${variant}. Antworten: ${JSON.stringify(answers)}`,
      });
      setSubmitted(true);
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (!step) return null;

    switch (step.type) {
      case 'intro':
        return (
          <div className="space-y-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.08em] leading-relaxed">
              {step.headline}
            </h1>
            {step.subtext && (
              <p className="text-sm text-muted-foreground tracking-[0.1em]">{step.subtext}</p>
            )}
            <button
              onClick={handleNext}
              className="border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase"
            >
              {step.buttonLabel}
            </button>
          </div>
        );

      case 'choice':
        return (
          <div className="space-y-8 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] leading-relaxed whitespace-pre-line">
              {step.headline}
            </h1>
            <div className="space-y-3 max-w-sm mx-auto">
              {step.options?.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChoice(opt.value)}
                  className="w-full border border-border px-6 py-4 text-sm tracking-[0.1em] font-medium text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-200 uppercase"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'dynamic': {
        const weak = isWeak();
        return (
          <div className="space-y-8 text-center">
            {weak ? (
              <>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em]">
                  DAS IST KEIN ZUFALL.
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground tracking-[0.08em]">
                  DEIN SYSTEM HAT LÜCKEN.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] leading-relaxed">
                  DANN IST DIE NÄCHSTE FRAGE,
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground tracking-[0.08em]">
                  WO NOCH MEHR POTENZIAL VERLOREN GEHT.
                </p>
              </>
            )}
            <button
              onClick={handleNext}
              className="border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase"
            >
              [ WEITER ]
            </button>
          </div>
        );
      }

      case 'capture':
        return (
          <div className="space-y-8 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em]">
              {step.headline}
            </h1>
            <div className="space-y-4 max-w-sm mx-auto text-left">
              <div>
                <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">UNTERNEHMEN <span className="text-muted-foreground/50">(OPTIONAL)</span></label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide"
                />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !email.trim()}
              className="border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : '[ ANALYSE ANFORDERN ]'}
            </button>
          </div>
        );

      case 'result':
        return (
          <div className="space-y-10 text-center animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">
              DEIN ERGEBNIS IST KLAR.
            </h1>

            <div className="space-y-3">
              <p className="text-base sm:text-lg text-foreground tracking-[0.08em]">
                DEIN UNTERNEHMEN VERLIERT GELD,
              </p>
              <p className="text-base sm:text-lg text-foreground tracking-[0.08em]">
                WEIL DEIN SYSTEM NICHT SAUBER AUFGEBAUT IST.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-sm sm:text-base text-muted-foreground tracking-[0.08em]">
                DAS IST KEIN ZUFALL.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground tracking-[0.08em]">
                UND ES WIRD NICHT VON ALLEINE BESSER.
              </p>
            </div>

            <div className="pt-6">
              <button
                onClick={() => window.location.href = '/landing'}
                className="border border-foreground px-10 py-5 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase"
              >
                [ KOSTENLOSE STRATEGIE-SESSION ]
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground/70 tracking-[0.08em]">
                WIR ZEIGEN DIR KONKRET,
              </p>
              <p className="text-xs text-muted-foreground/70 tracking-[0.08em]">
                WO DU GELD VERLIERST – UND WIE DU ES FIXST.
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground/40 tracking-[0.1em] pt-4">
              ODER ERHALTE ZUERST DEINE ANALYSE.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted && step.type === 'capture') {
    // Auto-advance to result
    setCurrentStep(steps.length - 1);
    setSubmitted(false);
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {/* Progress bar */}
      {currentStep > 0 && currentStep < steps.length - 1 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-[2px] bg-border">
            <div
              className="h-full bg-foreground transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[480px]">
          {renderStep()}
        </div>
      </div>

      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground tracking-[0.12em]">KÖFMAN</p>
      </footer>
    </div>
  );
}
