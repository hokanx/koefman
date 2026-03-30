import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  // Importance: dringend +2, bald +1, nicht dringend 0
  if (importance === 'hoch') score += 2;
  else if (importance === 'mittel') score += 1;

  // Commitment: ja +2, vielleicht +1, eher nicht 0
  if (commitment === 'ja') score += 2;
  else if (commitment === 'vielleicht') score += 1;

  // Urgency: sofort +2, wochen +1, irgendwann 0
  if (urgency === 'sofort') score += 2;
  else if (urgency === 'wochen') score += 1;

  // Company size bonus
  // (handled externally if needed)

  let level = 'low';
  if (score >= 5) level = 'high';
  else if (score >= 3) level = 'medium';

  return { score, level };
}

function getCtaText(level: string): string {
  if (level === 'high') return 'JETZT STRATEGIE KLAR FESTLEGEN';
  if (level === 'medium') return 'STRATEGIE GEMEINSAM KLÄREN';
  return 'OPTIONAL: STRATEGIE BESPRECHEN';
}

function getCtaSubtext(level: string): string {
  if (level === 'high') return 'Das solltest du jetzt konkret angehen.';
  if (level === 'medium') return 'Lass uns gemeinsam schauen, wo du ansetzt.';
  return 'Du kannst dir das erstmal in Ruhe anschauen.';
}

export default function DiagnosticIntake() {
  const [searchParams] = useSearchParams();
  const variant = searchParams.get('v') || 'direct';

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');

  // Result
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [intentLevel, setIntentLevel] = useState('medium');

  const canStep1 = industry && companySize && inquiries && revenueClarity;
  const canStep2 = problems.length > 0;
  const canStep3 = importance && commitment && name.trim() && email.trim();

  const toggleProblem = (v: string) =>
    setProblems(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);

  const handleSubmit = async () => {
    if (!canStep3) return;
    setSubmitting(true);
    setPhase(4);

    const { score, level } = computeIntentScore(importance, commitment, urgency);
    setIntentLevel(level);

    try {
      let qrSessionId: string | null = null;
      try { qrSessionId = sessionStorage.getItem('qr_session_id'); } catch {}

      const response = await supabase.functions.invoke('generate-lead-analysis', {
        body: {
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || null,
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
        },
      });

      if (response.error) throw response.error;
      const data = response.data;
      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        setEmailSent(data.email_sent || false);
        try { sessionStorage.setItem('intake_completed', 'true'); } catch {}
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

          {/* STEP 3 — COMMITMENT + CAPTURE */}
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

                <div className="border-t border-border pt-8">
                  <p className="text-[10px] text-muted-foreground tracking-[0.12em] uppercase mb-4">WOHIN SOLLEN WIR DEINE ANALYSE SCHICKEN?</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">NAME *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">EMAIL *</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">UNTERNEHMEN <span className="text-muted-foreground/50">(OPTIONAL)</span></label>
                      <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                        className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide" />
                    </div>
                  </div>
                </div>

                {/* Soft pressure */}
                <p className="text-[10px] text-muted-foreground/40 tracking-[0.08em] text-center">
                  Wir arbeiten nur mit einer begrenzten Anzahl an Anfragen gleichzeitig.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setPhase(2)}
                  className="flex-1 border border-border px-6 py-4 text-sm tracking-[0.1em] font-medium text-muted-foreground bg-transparent hover:border-foreground hover:text-foreground transition-colors uppercase">
                  ← ZURÜCK
                </button>
                <button onClick={handleSubmit} disabled={!canStep3 || submitting}
                  className="flex-1 border border-foreground px-6 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed">
                  {submitting ? '...' : 'ANALYSE ERHALTEN'}
                </button>
              </div>
            </div>
          )}

          {/* RESULT */}
          {phase === 4 && (
            <>
              {submitting && (
                <div className="space-y-8 text-center animate-fade-in">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 border border-foreground border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-[0.1em]">DEINE ANALYSE WIRD ERSTELLT.</h1>
                  <p className="text-sm text-muted-foreground tracking-[0.08em]">DAS DAUERT NUR EINEN MOMENT.</p>
                </div>
              )}

              {analysisFailed && !analysis && !submitting && (
                <div className="space-y-10 text-center animate-fade-in">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-[0.1em]">DEINE ANALYSE KONNTE GERADE NICHT VOLLSTÄNDIG GELADEN WERDEN.</h1>
                  <p className="text-sm text-muted-foreground tracking-[0.08em]">DEINE ANGABEN WURDEN GESPEICHERT UND WIR KÜMMERN UNS DARUM.</p>
                  <button onClick={() => window.location.href = '/system'}
                    className="border border-foreground px-10 py-5 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase">
                    [ KOSTENLOSE STRATEGIE-SESSION BUCHEN ]
                  </button>
                </div>
              )}

              {analysis && !submitting && (
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

                  {/* Decision Section */}
                  <div className="border-t border-[hsl(var(--border))] pt-10 pb-4">
                    <h2 className="text-lg sm:text-xl font-semibold tracking-[0.1em] text-center mb-10">DU HAST JETZT ZWEI MÖGLICHKEITEN.</h2>

                    <div className="mb-6">
                      <p className="text-sm font-semibold tracking-[0.08em] text-muted-foreground mb-2">1. DU SETZT ES SELBST UM.</p>
                      <p className="text-sm text-muted-foreground/70 leading-[1.7]">Du kannst die Analyse nutzen und versuchen, die Probleme eigenständig zu lösen.</p>
                    </div>

                    <div className="mb-12">
                      <p className="text-base sm:text-lg font-bold tracking-[0.08em] text-foreground mb-2">2. WIR ZEIGEN DIR KONKRET, WAS DU ÄNDERN MUSST.</p>
                      <p className="text-sm sm:text-base text-foreground leading-[1.7]">Im Gespräch identifizieren wir die genauen Punkte, an denen du aktuell Umsatz verlierst – und setzen direkt an.</p>
                    </div>

                    <div className="text-center space-y-4">
                      <p className="text-xs text-muted-foreground tracking-[0.08em]">
                        {getCtaSubtext(intentLevel).toUpperCase()}
                      </p>

                      <button onClick={() => window.location.href = '/system'}
                        className="border-2 border-foreground px-10 py-5 text-sm sm:text-base tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase">
                        [ {getCtaText(intentLevel)} ]
                      </button>

                      {emailSent && (
                        <p className="text-xs text-muted-foreground tracking-[0.08em] mt-4">DIE KURZANALYSE WURDE ZUSÄTZLICH PER E-MAIL AN DICH GESENDET.</p>
                      )}

                      <p className="text-[11px] text-muted-foreground/40 tracking-[0.08em] mt-6 cursor-default">Ich schaue mir das erstmal selbst an.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground tracking-[0.12em]">KÖFMAN</p>
      </footer>
    </div>
  );
}
