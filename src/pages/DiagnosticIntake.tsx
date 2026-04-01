import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BrandMark from '@/components/shared/BrandMark';

interface AnalysisResult {
  headline: string;
  main_issue: string;
  practical_meaning: string;
  priorities: string[];
  next_step: string;
}

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

export default function DiagnosticIntake() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const variant = searchParams.get('v') || 'direct';

  // Phases: 0=intro, 1=situation, 2=problems, 3=commitment, 4=analyzing, 5=result, 6=email-capture
  const [phase, setPhase] = useState(0);

  // Step 1
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [inquiries, setInquiries] = useState('');
  const [revenueClarity, setRevenueClarity] = useState('');

  // Step 2
  const [problems, setProblems] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');

  // Step 3
  const [importance, setImportance] = useState('');
  const [commitment, setCommitment] = useState('');
  const [urgency, setUrgency] = useState('');

  // Result
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Email capture (phase 6)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const canStep1 = industry && companySize && inquiries && revenueClarity;
  const canStep2 = problems.length > 0;
  const canStep3 = importance && commitment;

  const toggleProblem = (v: string) =>
    setProblems(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);

  // Generate analysis WITHOUT name/email
  const handleAnalyze = async () => {
    if (!canStep3) return;
    setSubmitting(true);
    setPhase(4);

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
        setPhase(5);
      } else {
        setAnalysisFailed(true);
        setPhase(5);
      }
    } catch (err) {
      console.error('Analysis generation error:', err);
      setAnalysisFailed(true);
      setPhase(5);
    } finally {
      setSubmitting(false);
    }
  };

  // Send email after capturing name + email
  const handleSendEmail = async () => {
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

      if (response.error) throw response.error;
      setEmailSent(true);

      // Navigate to booking page
      setTimeout(() => {
        navigate(`/book?sid=${submissionId}`);
      }, 2000);
    } catch (err) {
      console.error('Email capture error:', err);
      setEmailSent(true); // still proceed
      setTimeout(() => {
        navigate(`/book?sid=${submissionId}`);
      }, 2000);
    } finally {
      setSendingEmail(false);
    }
  };

  const progress = phase === 0 ? 0 : phase >= 4 ? 100 : (phase / 3) * 100;

  const optionBtn = (selected: boolean) =>
    `w-full border px-6 py-4 text-sm tracking-[0.1em] font-medium transition-colors duration-200 uppercase ${
      selected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border text-foreground bg-transparent hover:bg-foreground hover:text-background'
    }`;

  const multiBtn = (selected: boolean) =>
    `w-full border px-6 py-4 text-sm tracking-[0.1em] font-medium transition-colors duration-200 uppercase ${
      selected
        ? 'border-foreground bg-foreground text-background'
        : 'border-border text-foreground bg-transparent hover:border-foreground/50'
    }`;

  const pkg = analysis?.recommended_package ? PACKAGE_INFO[analysis.recommended_package] : PACKAGE_INFO['setup_59'];

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {/* Progress */}
      {phase > 0 && phase < 4 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-[2px] bg-border">
            <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-center py-3">
            <span className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
              SCHRITT {phase} VON 3
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[480px]">

          {/* INTRO */}
          {phase === 0 && (
            <div className="space-y-8 text-center animate-fade-in">
              <div className="mb-6">
                <BrandMark variant="wordmark" size="md" align="center" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.08em] leading-relaxed">
                WO VERLIERST DU GELD?
              </h1>
              <p className="text-sm text-muted-foreground tracking-[0.1em]">3 SCHRITTE. KLARE ANTWORT.</p>
              <button onClick={() => setPhase(1)}
                className="border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase">
                [ START ]
              </button>
            </div>
          )}

          {/* STEP 1 — SITUATION */}
          {phase === 1 && (
            <div className="space-y-10 animate-fade-in">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                WIR SCHAUEN UNS KURZ AN, WO AKTUELL POTENZIAL VERLOREN GEHT.
              </h1>
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">BRANCHE</p>
                  <div className="space-y-2">
                    {INDUSTRIES.map(o => (
                      <button key={o.value} onClick={() => setIndustry(o.value)} className={optionBtn(industry === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">UNTERNEHMENSGRÖSSE</p>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_SIZES.map(o => (
                      <button key={o.value} onClick={() => setCompanySize(o.value)} className={optionBtn(companySize === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">AKTUELLE ANFRAGEN</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INQUIRY_LEVELS.map(o => (
                      <button key={o.value} onClick={() => setInquiries(o.value)} className={optionBtn(inquiries === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">UMSATZKLARHEIT</p>
                  <div className="space-y-2">
                    {REVENUE_CLARITY.map(o => (
                      <button key={o.value} onClick={() => setRevenueClarity(o.value)} className={optionBtn(revenueClarity === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setPhase(2)} disabled={!canStep1}
                className="w-full border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed">
                WEITER →
              </button>
            </div>
          )}

          {/* STEP 2 — PROBLEM DEPTH */}
          {phase === 2 && (
            <div className="space-y-10 animate-fade-in">
              <div className="text-center space-y-3">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] leading-relaxed">
                  AN WELCHER STELLE VERLIERST DU AKTUELL DIE MEISTEN ANFRAGEN ODER UMSÄTZE?
                </h1>
                <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em]">
                  Die meisten Unternehmen verlieren hier jeden Monat messbar Umsatz.
                </p>
              </div>
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">HAUPTPROBLEM (MEHRFACHAUSWAHL)</p>
                  <div className="space-y-2">
                    {PROBLEMS.map(o => (
                      <button key={o.value} onClick={() => toggleProblem(o.value)} className={multiBtn(problems.includes(o.value))}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-2">WAS GENAU LÄUFT AKTUELL NICHT SO, WIE ES SOLLTE?</p>
                  <p className="text-[10px] text-muted-foreground/50 tracking-[0.08em] mb-3">Je genauer du bist, desto konkreter wird deine Analyse.</p>
                  <textarea
                    value={freeText}
                    onChange={e => setFreeText(e.target.value)}
                    rows={4}
                    className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide resize-none"
                    placeholder="z. B. viele Anfragen, aber wenig Abschlüsse / Chaos im Ablauf / keine Struktur…"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPhase(1)}
                  className="flex-1 border border-border px-6 py-4 text-sm tracking-[0.1em] font-medium text-muted-foreground bg-transparent hover:border-foreground hover:text-foreground transition-colors uppercase">
                  ← ZURÜCK
                </button>
                <button onClick={() => setPhase(3)} disabled={!canStep2}
                  className="flex-1 border border-foreground px-6 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed">
                  WEITER →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — COMMITMENT (no name/email) */}
          {phase === 3 && (
            <div className="space-y-10 animate-fade-in">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                NUR NOCH EIN SCHRITT, DANN IST DEINE ANALYSE FERTIG.
              </h1>
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">WIE DRINGEND IST ES FÜR DICH, DAS AKTUELL ZU LÖSEN?</p>
                  <div className="space-y-2">
                    {IMPORTANCE_LEVELS.map(o => (
                      <button key={o.value} onClick={() => setImportance(o.value)} className={optionBtn(importance === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">WENN DU KONKRET SIEHST, WO DEIN PROBLEM LIEGT – WÄRST DU BEREIT, DAS STRUKTURIERT ZU LÖSEN?</p>
                  <div className="space-y-2">
                    {COMMITMENT_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setCommitment(o.value)} className={optionBtn(commitment === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">WIE SCHNELL MÖCHTEST DU ERGEBNISSE SEHEN?</p>
                  <div className="space-y-2">
                    {URGENCY_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setUrgency(o.value)} className={optionBtn(urgency === o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/40 tracking-[0.08em] text-center">
                  Wir arbeiten nur mit einer begrenzten Anzahl an Anfragen gleichzeitig.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPhase(2)}
                  className="flex-1 border border-border px-6 py-4 text-sm tracking-[0.1em] font-medium text-muted-foreground bg-transparent hover:border-foreground hover:text-foreground transition-colors uppercase">
                  ← ZURÜCK
                </button>
                <button onClick={handleAnalyze} disabled={!canStep3 || submitting}
                  className="flex-1 border border-foreground px-6 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed">
                  {submitting ? '...' : 'ANALYSE STARTEN'}
                </button>
              </div>
            </div>
          )}

          {/* ANALYZING */}
          {phase === 4 && (
            <div className="space-y-8 text-center animate-fade-in">
              <div className="flex justify-center">
                <div className="h-6 w-6 border border-foreground border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.1em]">DEINE ANALYSE WIRD ERSTELLT.</h1>
              <p className="text-sm text-muted-foreground tracking-[0.08em]">DAS DAUERT NUR EINEN MOMENT.</p>
            </div>
          )}

          {/* RESULT (shown before name/email) */}
          {phase === 5 && (
            <>
              {analysisFailed && !analysis && (
                <div className="space-y-10 text-center animate-fade-in">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">DEINE ANALYSE KONNTE GERADE NICHT VOLLSTÄNDIG GELADEN WERDEN.</h1>
                  <p className="text-sm text-muted-foreground tracking-[0.08em]">DEINE ANGABEN WURDEN GESPEICHERT UND WIR KÜMMERN UNS DARUM.</p>
                  <button onClick={() => navigate('/book')}
                    className="border border-foreground px-10 py-5 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase">
                    [ STRATEGIEGESPRÄCH BUCHEN ]
                  </button>
                </div>
              )}

              {analysis && (
                <div className="animate-fade-in">
                  <div className="text-center pb-8">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em] mb-4">DEINE KURZANALYSE IST BEREIT.</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground tracking-[0.08em] leading-relaxed max-w-[360px] mx-auto">
                      BASIEREND AUF DEINEN ANGABEN ZEIGT SICH AKTUELL VOR ALLEM EIN SYSTEMPROBLEM.
                    </p>
                  </div>

                  <div className="border-t border-[hsl(var(--border))] py-7">
                    <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">GRÖSSTE SCHWACHSTELLE</p>
                    <p className="text-sm sm:text-base text-foreground leading-[1.7]">{analysis.main_issue}</p>
                  </div>

                  <div className="border-t border-[hsl(var(--border))] py-7">
                    <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">WAS DAS PRAKTISCH BEDEUTET</p>
                    <p className="text-sm sm:text-base text-foreground leading-[1.7]">{analysis.practical_meaning}</p>
                  </div>

                  <div className="border-t border-[hsl(var(--border))] py-7">
                    <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-5">DIE 3 WICHTIGSTEN HEBEL</p>
                    <div className="space-y-4">
                      {analysis.priorities.filter(p => p).map((priority, i) => (
                        <div key={i} className="flex gap-4 items-baseline">
                          <span className="text-muted-foreground text-xs font-semibold tracking-[0.1em] shrink-0 w-5 text-right">{i + 1}.</span>
                          <p className="text-sm sm:text-base text-foreground leading-[1.7]">{priority}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[hsl(var(--border))] py-7">
                    <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">NÄCHSTER SINNVOLLER SCHRITT</p>
                    <p className="text-sm sm:text-base text-foreground leading-[1.7]">{analysis.next_step}</p>
                  </div>

                  {/* Package Recommendation */}
                  {pkg && (
                    <div className="border-t border-[hsl(var(--border))] py-7">
                      <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-3">UNSERE EMPFEHLUNG FÜR DICH</p>
                      <div className="border border-foreground/20 p-6 space-y-3">
                        <p className="text-base sm:text-lg font-bold tracking-[0.08em]">{pkg.title}</p>
                        <p className="text-sm text-foreground/80">{pkg.price}</p>
                        <p className="text-sm text-muted-foreground leading-[1.6]">{pkg.detail}</p>
                      </div>
                    </div>
                  )}

                  {/* CTA to capture email */}
                  <div className="border-t border-[hsl(var(--border))] pt-10 pb-4 text-center">
                    <button onClick={() => setPhase(6)}
                      className="border-2 border-foreground px-10 py-5 text-sm sm:text-base tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase">
                      [ ANALYSE PER E-MAIL ERHALTEN ]
                    </button>
                    <p className="text-[10px] text-muted-foreground/40 tracking-[0.08em] mt-4">KOSTENLOS. KEINE VERPFLICHTUNG.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* EMAIL CAPTURE (phase 6) */}
          {phase === 6 && (
            <div className="space-y-10 animate-fade-in">
              {emailSent ? (
                <div className="text-center space-y-6">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">ANALYSE GESENDET.</h1>
                  <p className="text-sm text-muted-foreground tracking-[0.08em]">DU WIRST JETZT ZUR TERMINBUCHUNG WEITERGELEITET.</p>
                  <div className="flex justify-center">
                    <div className="h-4 w-4 border border-foreground border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.08em] text-center leading-relaxed">
                    WOHIN SOLLEN WIR DEINE ANALYSE SCHICKEN?
                  </h1>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">NAME *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">E-MAIL *</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide" />
                    </div>
                  </div>
                  <button onClick={handleSendEmail}
                    disabled={!name.trim() || !email.trim() || !email.includes('@') || sendingEmail}
                    className="w-full border-2 border-foreground px-10 py-5 text-sm tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed">
                    {sendingEmail ? '...' : 'ANALYSE PER E-MAIL ERHALTEN'}
                  </button>
                  <p className="text-[10px] text-muted-foreground/40 tracking-[0.08em] text-center">KOSTENLOS. KEINE VERPFLICHTUNG.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="py-10 text-center">
        <BrandMark variant="wordmark" size="sm" align="center" />
      </footer>
    </div>
  );
}
