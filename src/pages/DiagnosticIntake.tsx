import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Answer = string;

interface AnalysisResult {
  headline: string;
  main_issue: string;
  practical_meaning: string;
  priorities: string[];
  next_step: string;
}

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
    headline: '',
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
    headline: 'DEINE KURZANALYSE IST BEREIT.',
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
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const step = steps[currentStep];
  const progress = (currentStep / (steps.length - 1)) * 100;

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
    setCurrentStep(steps.length - 1); // go to result screen immediately

    try {
      // Try to get qr_session_id from sessionStorage
      let qrSessionId: string | null = null;
      try {
        qrSessionId = sessionStorage.getItem('qr_session_id');
      } catch {}

      const response = await supabase.functions.invoke('generate-lead-analysis', {
        body: {
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || null,
          business_type: answers.business_type || '',
          lead_flow: answers.inquiries || '',
          revenue_clarity: answers.revenue_loss || '',
          main_problem: answers.pain_point || '',
          variant,
          qr_session_id: qrSessionId,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        setEmailSent(data.email_sent || false);
      } else {
        setAnalysisFailed(true);
      }
    } catch (err) {
      console.error('Analysis generation error:', err);
      setAnalysisFailed(true);
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
                <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">
                  UNTERNEHMEN <span className="text-muted-foreground/50">(OPTIONAL)</span>
                </label>
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
        // Loading state
        if (submitting) {
          return (
            <div className="space-y-8 text-center animate-fade-in">
              <div className="flex justify-center">
                <div className="h-6 w-6 border border-foreground border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.1em]">
                DEINE ANALYSE WIRD ERSTELLT.
              </h1>
              <p className="text-sm text-muted-foreground tracking-[0.08em]">
                DAS DAUERT NUR EINEN MOMENT.
              </p>
            </div>
          );
        }

        // Failure state
        if (analysisFailed && !analysis) {
          return (
            <div className="space-y-10 text-center animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">
                DEIN ERGEBNIS IST KLAR.
              </h1>
              <div className="space-y-3">
                <p className="text-base text-foreground tracking-[0.08em]">
                  DEINE ANALYSE KONNTE GERADE NICHT VOLLSTÄNDIG GELADEN WERDEN.
                </p>
                <p className="text-sm text-muted-foreground tracking-[0.08em]">
                  DEINE ANGABEN WURDEN GESPEICHERT UND WIR KÜMMERN UNS DARUM.
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
            </div>
          );
        }

        // Success state with analysis
        if (analysis) {
          return (
            <div className="space-y-0 animate-fade-in">
              <div className="text-center pb-10">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">
                  DEINE KURZANALYSE IST BEREIT.
                </h1>
              </div>

              {/* Main issue */}
              <div className="border-t border-[#1A1A1A] py-6">
                <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">
                  WAHRSCHEINLICH GRÖSSTE SCHWACHSTELLE
                </p>
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  {analysis.main_issue}
                </p>
              </div>

              {/* Practical meaning */}
              <div className="border-t border-[#1A1A1A] py-6">
                <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">
                  WAS DAS PRAKTISCH BEDEUTET
                </p>
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  {analysis.practical_meaning}
                </p>
              </div>

              {/* Priorities */}
              <div className="border-t border-[#1A1A1A] py-6">
                <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-4">
                  DEINE NÄCHSTEN 3 HEBEL
                </p>
                <div className="space-y-3">
                  {analysis.priorities.filter(p => p).map((priority, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-muted-foreground text-sm shrink-0">{i + 1}.</span>
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{priority}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next step */}
              <div className="border-t border-[#1A1A1A] py-6">
                <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mb-3">
                  NÄCHSTER SINNVOLLER SCHRITT
                </p>
                <p className="text-sm sm:text-base text-foreground leading-relaxed">
                  {analysis.next_step}
                </p>
              </div>

              {/* CTA */}
              <div className="border-t border-[#1A1A1A] pt-10 text-center space-y-6">
                <button
                  onClick={() => window.location.href = '/landing'}
                  className="border border-foreground px-10 py-5 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase"
                >
                  [ KOSTENLOSE STRATEGIE-SESSION ]
                </button>

                {emailSent && (
                  <p className="text-xs text-muted-foreground tracking-[0.08em]">
                    DIE ANALYSE WURDE ZUSÄTZLICH PER E-MAIL AN DICH GESENDET.
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground/50 tracking-[0.08em]">
                  WIR ZEIGEN DIR KONKRET,<br />
                  WO DU GELD VERLIERST – UND WIE DU ES FIXST.
                </p>
              </div>
            </div>
          );
        }

        // Default/initial result (shouldn't normally appear)
        return null;

      default:
        return null;
    }
  };

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
