import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BrandMark from '@/components/shared/BrandMark';

interface AnalysisResult {
  headline: string;
  main_issue: string;
  practical_meaning: string;
  priorities: string[];
  next_step: string;
}

const STEPS = {
  INTRO: 0,
  INDUSTRY: 1,
  SIZE: 2,
  INQUIRIES: 3,
  REVENUE: 4,
  PROBLEMS: 5,
  FREETEXT: 6,
  IMPORTANCE: 7,
  COMMITMENT: 8,
  URGENCY: 9,
  ANALYZING: 10,
  RESULT: 11,
  EMAIL: 12,
} as const;

const TOTAL_QUESTION_STEPS = 9; // steps 1–9

const INDUSTRIES = [
  { label: 'DIENSTLEISTUNG', value: 'dienstleistung' },
  { label: 'LOKALES GESCHÄFT', value: 'lokal' },
  { label: 'HANDWERK', value: 'handwerk' },
  { label: 'ONLINE BUSINESS', value: 'online' },
  { label: 'ANDERE', value: 'andere' },
];

const COMPANY_SIZES = [
  { label: 'SOLO', value: 'solo' },
  { label: '2–5 MITARBEITER', value: '2-5' },
  { label: '6–15 MITARBEITER', value: '6-15' },
  { label: '15+', value: '15+' },
];

const INQUIRY_LEVELS = [
  { label: 'KAUM', value: 'kaum' },
  { label: 'UNREGELMÄSSIG', value: 'unregelmaessig' },
  { label: 'STABIL', value: 'stabil' },
  { label: 'STARK', value: 'stark' },
];

const REVENUE_CLARITY = [
  { label: 'UNKLAR', value: 'unklar' },
  { label: 'TEILWEISE', value: 'teilweise' },
  { label: 'KLAR', value: 'klar' },
];

const PROBLEMS = [
  { label: 'ZU WENIGE ANFRAGEN', value: 'wenig_anfragen' },
  { label: 'SCHLECHTE UMWANDLUNG', value: 'schlechte_umwandlung' },
  { label: 'UNKLARE ABLÄUFE', value: 'unklare_ablaeufe' },
  { label: 'ZEITVERLUST', value: 'zeitverlust' },
  { label: 'KEINE STRUKTUR', value: 'keine_struktur' },
];

const IMPORTANCE_LEVELS = [
  { label: 'NICHT DRINGEND', value: 'niedrig' },
  { label: 'SOLLTE BALD BESSER WERDEN', value: 'mittel' },
  { label: 'DRINGEND', value: 'hoch' },
];

const COMMITMENT_OPTIONS = [
  { label: 'JA', value: 'ja' },
  { label: 'VIELLEICHT', value: 'vielleicht' },
  { label: 'EHER NICHT', value: 'nein' },
];

const URGENCY_OPTIONS = [
  { label: 'SOFORT', value: 'sofort' },
  { label: 'IN DEN NÄCHSTEN WOCHEN', value: 'wochen' },
  { label: 'IRGENDWANN', value: 'irgendwann' },
];

function computeIntentScore(importance: string, commitment: string, urgency: string): { score: number; level: string } {
  let score = 0;
  if (importance === 'hoch') score += 2;
  else if (importance === 'mittel') score += 1;
  if (commitment === 'ja') score += 2;
  else if (commitment === 'vielleicht') score += 1;
  if (urgency === 'sofort') score += 2;
  else if (urgency === 'wochen') score += 1;
  let level = 'low';
  if (score >= 5) level = 'high';
  else if (score >= 3) level = 'medium';
  return { score, level };
}

/* ─── Reusable UI pieces ─── */

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border px-6 py-4 text-sm tracking-[0.1em] font-medium transition-all duration-200 uppercase min-h-[52px]
        ${selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-[hsl(var(--foreground)/0.25)] text-foreground/90 bg-transparent hover:border-foreground hover:bg-foreground hover:text-background'
        }`}
    >
      {children}
    </button>
  );
}

function MultiButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border px-6 py-4 text-sm tracking-[0.1em] font-medium transition-all duration-200 uppercase min-h-[52px]
        ${selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-[hsl(var(--foreground)/0.25)] text-foreground/90 bg-transparent hover:border-foreground/60'
        }`}
    >
      {children}
    </button>
  );
}

function ContinueButton({ onClick, disabled, children = 'WEITER →' }: { onClick: () => void; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full border-2 border-foreground px-8 py-5 text-sm tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-200 uppercase disabled:opacity-20 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] text-foreground/50 tracking-[0.1em] uppercase hover:text-foreground/80 transition-colors"
    >
      ← ZURÜCK
    </button>
  );
}

function StepShell({ children, step }: { children: React.ReactNode; step: number }) {
  return (
    <div key={step} className="space-y-8 animate-fade-in">
      {children}
    </div>
  );
}

/* ─── Main Component ─── */

export default function DiagnosticIntake() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const variant = searchParams.get('v') || 'direct';

  const [step, setStep] = useState<number>(STEPS.INTRO);

  // Data
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [inquiries, setInquiries] = useState('');
  const [revenueClarity, setRevenueClarity] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [importance, setImportance] = useState('');
  const [commitment, setCommitment] = useState('');
  const [urgency, setUrgency] = useState('');

  // Result
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Email
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const toggleProblem = (v: string) =>
    setProblems(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);

  const handleAnalyze = useCallback(async () => {
    setSubmitting(true);
    setStep(STEPS.ANALYZING);
    const { level } = computeIntentScore(importance, commitment, urgency);

    try {
      let qrSessionId: string | null = null;
      try { qrSessionId = sessionStorage.getItem('qr_session_id'); } catch {}

      const response = await supabase.functions.invoke('generate-lead-analysis', {
        body: {
          business_type: industry,
          lead_flow: inquiries,
          revenue_clarity: revenueClarity,
          main_problem: problems.join(', '),
          variant,
          qr_session_id: qrSessionId,
          company_size: companySize,
          problems,
          free_text: freeText.trim(),
          importance,
          commitment,
          urgency,
          intent_score: level,
          skip_email: true,
        },
      });

      if (response.error) throw response.error;
      const data = response.data;
      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        setSubmissionId(data.submission_id || null);
        setStep(STEPS.RESULT);
      } else {
        setAnalysisFailed(true);
        setStep(STEPS.RESULT);
      }
    } catch (err) {
      console.error('Analysis generation error:', err);
      setAnalysisFailed(true);
      setStep(STEPS.RESULT);
    } finally {
      setSubmitting(false);
    }
  }, [industry, companySize, inquiries, revenueClarity, problems, freeText, importance, commitment, urgency, variant]);

  const handleSendEmail = useCallback(async () => {
    if (!name.trim() || !email.trim() || !email.includes('@')) return;
    setSendingEmail(true);

    try {
      const response = await supabase.functions.invoke('generate-lead-analysis', {
        body: {
          capture_lead: true,
          submission_id: submissionId,
          name: name.trim(),
          email: email.trim(),
        },
      });

      // Always proceed regardless of email result
      if (response.error) {
        console.error('Email send error:', response.error);
      }
      const data = response.data;
      if (!data?.email_sent) {
        console.warn('Email was not sent, proceeding anyway');
      }
      setEmailSent(true);
      setTimeout(() => navigate(`/book?sid=${submissionId}`), 2000);
    } catch (err) {
      console.error('Email capture error:', err);
      // Fail-safe: always proceed
      setEmailSent(true);
      setTimeout(() => navigate(`/book?sid=${submissionId}`), 2000);
    } finally {
      setSendingEmail(false);
    }
  }, [name, email, submissionId, navigate]);

  const progress = step >= 1 && step <= TOTAL_QUESTION_STEPS
    ? Math.round((step / TOTAL_QUESTION_STEPS) * 100)
    : step > TOTAL_QUESTION_STEPS ? 100 : 0;

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {/* Progress bar */}
      {step >= 1 && step <= TOTAL_QUESTION_STEPS && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-[2px] bg-[hsl(var(--foreground)/0.1)]">
            <div className="h-full bg-foreground transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[480px]">

          {/* ── INTRO ── */}
          {step === STEPS.INTRO && (
            <StepShell step={0}>
              <div className="text-center space-y-8">
                <BrandMark variant="wordmark" size="md" align="center" />
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.08em] leading-relaxed">
                  WO VERLIERST DU GELD?
                </h1>
                <p className="text-sm text-foreground/60 tracking-[0.1em]">9 KURZE FRAGEN. KLARE ANTWORT.</p>
                <ContinueButton onClick={() => setStep(STEPS.INDUSTRY)}>
                  [ START ]
                </ContinueButton>
              </div>
            </StepShell>
          )}

          {/* ── 1. INDUSTRY ── */}
          {step === STEPS.INDUSTRY && (
            <StepShell step={1}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                IN WELCHER BRANCHE BIST DU TÄTIG?
              </h2>
              <div className="space-y-2">
                {INDUSTRIES.map(o => (
                  <OptionButton key={o.value} selected={industry === o.value} onClick={() => setIndustry(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.SIZE)} disabled={!industry} />
            </StepShell>
          )}

          {/* ── 2. SIZE ── */}
          {step === STEPS.SIZE && (
            <StepShell step={2}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WIE GROSS IST DEIN UNTERNEHMEN?
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {COMPANY_SIZES.map(o => (
                  <OptionButton key={o.value} selected={companySize === o.value} onClick={() => setCompanySize(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.INQUIRIES)} disabled={!companySize} />
              <BackButton onClick={() => setStep(STEPS.INDUSTRY)} />
            </StepShell>
          )}

          {/* ── 3. INQUIRIES ── */}
          {step === STEPS.INQUIRIES && (
            <StepShell step={3}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WIE VIELE ANFRAGEN BEKOMMST DU AKTUELL?
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {INQUIRY_LEVELS.map(o => (
                  <OptionButton key={o.value} selected={inquiries === o.value} onClick={() => setInquiries(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.REVENUE)} disabled={!inquiries} />
              <BackButton onClick={() => setStep(STEPS.SIZE)} />
            </StepShell>
          )}

          {/* ── 4. REVENUE CLARITY ── */}
          {step === STEPS.REVENUE && (
            <StepShell step={4}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WIE KLAR IST DIR, WOHER DEIN UMSATZ KOMMT?
              </h2>
              <div className="space-y-2">
                {REVENUE_CLARITY.map(o => (
                  <OptionButton key={o.value} selected={revenueClarity === o.value} onClick={() => setRevenueClarity(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.PROBLEMS)} disabled={!revenueClarity} />
              <BackButton onClick={() => setStep(STEPS.INQUIRIES)} />
            </StepShell>
          )}

          {/* ── 5. PROBLEMS ── */}
          {step === STEPS.PROBLEMS && (
            <StepShell step={5}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WO VERLIERST DU AKTUELL AM MEISTEN?
              </h2>
              <p className="text-sm text-foreground/60 tracking-[0.08em] text-center">
                Wähle alles, was zutrifft.
              </p>
              <div className="space-y-2">
                {PROBLEMS.map(o => (
                  <MultiButton key={o.value} selected={problems.includes(o.value)} onClick={() => toggleProblem(o.value)}>
                    {o.label}
                  </MultiButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.FREETEXT)} disabled={problems.length === 0} />
              <BackButton onClick={() => setStep(STEPS.REVENUE)} />
            </StepShell>
          )}

          {/* ── 6. FREE TEXT ── */}
          {step === STEPS.FREETEXT && (
            <StepShell step={6}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WAS GENAU LÄUFT AKTUELL NICHT?
              </h2>
              <p className="text-sm text-foreground/60 tracking-[0.08em] text-center">
                Je genauer, desto konkreter deine Analyse. Optional.
              </p>
              <textarea
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                rows={4}
                className="w-full border border-[hsl(var(--foreground)/0.25)] bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide resize-none"
                placeholder="z. B. viele Anfragen, aber wenig Abschlüsse…"
              />
              <ContinueButton onClick={() => setStep(STEPS.IMPORTANCE)} />
              <BackButton onClick={() => setStep(STEPS.PROBLEMS)} />
            </StepShell>
          )}

          {/* ── 7. IMPORTANCE ── */}
          {step === STEPS.IMPORTANCE && (
            <StepShell step={7}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WIE DRINGEND IST ES, DAS ZU LÖSEN?
              </h2>
              <div className="space-y-2">
                {IMPORTANCE_LEVELS.map(o => (
                  <OptionButton key={o.value} selected={importance === o.value} onClick={() => setImportance(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.COMMITMENT)} disabled={!importance} />
              <BackButton onClick={() => setStep(STEPS.FREETEXT)} />
            </StepShell>
          )}

          {/* ── 8. COMMITMENT ── */}
          {step === STEPS.COMMITMENT && (
            <StepShell step={8}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WÄRST DU BEREIT, DAS STRUKTURIERT ZU LÖSEN?
              </h2>
              <div className="space-y-2">
                {COMMITMENT_OPTIONS.map(o => (
                  <OptionButton key={o.value} selected={commitment === o.value} onClick={() => setCommitment(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={() => setStep(STEPS.URGENCY)} disabled={!commitment} />
              <BackButton onClick={() => setStep(STEPS.IMPORTANCE)} />
            </StepShell>
          )}

          {/* ── 9. URGENCY ── */}
          {step === STEPS.URGENCY && (
            <StepShell step={9}>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WIE SCHNELL MÖCHTEST DU ERGEBNISSE SEHEN?
              </h2>
              <div className="space-y-2">
                {URGENCY_OPTIONS.map(o => (
                  <OptionButton key={o.value} selected={urgency === o.value} onClick={() => setUrgency(o.value)}>
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              <ContinueButton onClick={handleAnalyze} disabled={!urgency || submitting}>
                {submitting ? '...' : 'ANALYSE STARTEN'}
              </ContinueButton>
              <BackButton onClick={() => setStep(STEPS.COMMITMENT)} />
            </StepShell>
          )}

          {/* ── ANALYZING ── */}
          {step === STEPS.ANALYZING && (
            <StepShell step={10}>
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-6 w-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.1em]">
                  ANALYSE WIRD ERSTELLT.
                </h2>
                <p className="text-sm text-foreground/60 tracking-[0.08em]">NUR EINEN MOMENT.</p>
              </div>
            </StepShell>
          )}

          {/* ── RESULT ── */}
          {step === STEPS.RESULT && (
            <StepShell step={11}>
              {analysisFailed && !analysis ? (
                <div className="text-center space-y-8">
                  <h2 className="text-2xl font-semibold tracking-[0.1em]">
                    ANALYSE KONNTE NICHT GELADEN WERDEN.
                  </h2>
                  <p className="text-sm text-foreground/60 tracking-[0.08em]">
                    DEINE ANGABEN WURDEN GESPEICHERT.
                  </p>
                  <ContinueButton onClick={() => navigate('/book')}>
                    [ STRATEGIEGESPRÄCH BUCHEN ]
                  </ContinueButton>
                </div>
              ) : analysis ? (
                <div className="space-y-8">
                  <div className="text-center space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">
                      DEINE KURZANALYSE
                    </h2>
                    <p className="text-sm text-foreground/60 tracking-[0.08em]">
                      Basierend auf deinen Angaben:
                    </p>
                  </div>

                  <div className="space-y-5 pt-2">
                    <div className="flex gap-4 items-start">
                      <span className="text-foreground/40 text-sm font-bold shrink-0 mt-0.5">▸</span>
                      <p className="text-sm sm:text-base text-foreground leading-[1.7]">
                        <span className="font-semibold">Größte Schwachstelle:</span> {analysis.main_issue}
                      </p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <span className="text-foreground/40 text-sm font-bold shrink-0 mt-0.5">▸</span>
                      <p className="text-sm sm:text-base text-foreground leading-[1.7]">
                        <span className="font-semibold">Was das bedeutet:</span> {analysis.practical_meaning}
                      </p>
                    </div>
                    {analysis.priorities.filter(Boolean).slice(0, 2).map((p, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <span className="text-foreground/40 text-sm font-bold shrink-0 mt-0.5">▸</span>
                        <p className="text-sm sm:text-base text-foreground leading-[1.7]">{p}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-[hsl(var(--foreground)/0.1)]">
                    <p className="text-xs text-foreground/50 tracking-[0.08em] text-center mb-6">
                      Die vollständige Analyse erhältst du per E-Mail.
                    </p>
                    <ContinueButton onClick={() => setStep(STEPS.EMAIL)}>
                      ANALYSE PER E-MAIL ERHALTEN
                    </ContinueButton>
                    <p className="text-[10px] text-foreground/30 tracking-[0.08em] text-center mt-4">
                      KOSTENLOS. KEINE VERPFLICHTUNG.
                    </p>
                  </div>
                </div>
              ) : null}
            </StepShell>
          )}

          {/* ── EMAIL CAPTURE ── */}
          {step === STEPS.EMAIL && (
            <StepShell step={12}>
              {emailSent ? (
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-semibold tracking-[0.1em]">ANALYSE WIRD VORBEREITET.</h2>
                  <p className="text-sm text-foreground/60 tracking-[0.08em]">
                    BITTE PRÜFE DEIN POSTFACH IN KÜRZE.
                  </p>
                  <div className="flex justify-center">
                    <div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                    WOHIN SOLLEN WIR DEINE ANALYSE SCHICKEN?
                  </h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs text-foreground/60 tracking-[0.1em] mb-2 uppercase">
                        NAME *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full border border-[hsl(var(--foreground)/0.25)] bg-transparent px-4 py-4 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/60 tracking-[0.1em] mb-2 uppercase">
                        E-MAIL *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full border border-[hsl(var(--foreground)/0.25)] bg-transparent px-4 py-4 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide"
                      />
                    </div>
                  </div>
                  <ContinueButton
                    onClick={handleSendEmail}
                    disabled={!name.trim() || !email.trim() || !email.includes('@') || sendingEmail}
                  >
                    {sendingEmail ? '...' : 'ANALYSE PER E-MAIL ERHALTEN'}
                  </ContinueButton>
                  <p className="text-[10px] text-foreground/30 tracking-[0.08em] text-center">
                    KOSTENLOS. KEINE VERPFLICHTUNG.
                  </p>
                </div>
              )}
            </StepShell>
          )}

        </div>
      </div>

      <footer className="py-10 text-center">
        <BrandMark variant="wordmark" size="sm" align="center" />
      </footer>
    </div>
  );
}
