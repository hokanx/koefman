import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BrandMark from '@/components/shared/BrandMark';

const FadeSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
};

export default function StrategyStart() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'direct';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = name.trim() && email.trim() && email.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      await (supabase as any).from('strategy_requests').insert({
        name: name.trim(),
        email: email.trim(),
        main_problem: problem.trim() || null,
        source,
      });
      setSubmitted(true);
    } catch {
      // silent fail — data stored
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none tracking-wide';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <BrandMark variant="wordmark" size="md" />
        </div>
      </nav>

      {/* SECTION 1 — HOOK */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16">
        <div className="w-full max-w-[480px] text-center space-y-6">
          <FadeSection>
            <p className="text-xl sm:text-2xl font-semibold tracking-[0.08em] leading-[1.5] uppercase">
              DU HAST GESEHEN,
            </p>
          </FadeSection>
          <FadeSection>
            <p className="text-xl sm:text-2xl font-semibold tracking-[0.08em] leading-[1.5] uppercase">
              WO DEIN SYSTEM SCHWACH IST.
            </p>
          </FadeSection>
          <FadeSection>
            <p className="text-sm sm:text-base text-muted-foreground tracking-[0.08em] leading-[1.6] mt-4">
              Jetzt schauen wir uns an, wie du es konkret löst.
            </p>
          </FadeSection>
        </div>
      </section>

      {/* SECTION 2 — WHAT HAPPENS */}
      <section className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-[480px] space-y-8">
          <FadeSection>
            <p className="text-lg sm:text-xl font-semibold tracking-[0.08em] uppercase text-center leading-[1.5]">
              IN DER STRATEGIE-SESSION:
            </p>
          </FadeSection>
          <FadeSection>
            <div className="space-y-5 mt-6">
              {[
                'Wir analysieren dein aktuelles System.',
                'Wir identifizieren die größten Engpässe.',
                'Wir zeigen dir konkrete nächste Schritte.',
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-baseline">
                  <span className="text-muted-foreground text-xs font-semibold tracking-[0.1em] shrink-0 w-5 text-right">
                    {i + 1}.
                  </span>
                  <p className="text-sm sm:text-base text-foreground leading-[1.7] tracking-wide">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </FadeSection>
        </div>
      </section>

      {/* SECTION 3 — FORM */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-[480px]">
          {submitted ? (
            <FadeSection>
              <div className="text-center space-y-6">
                <p className="text-2xl sm:text-3xl font-semibold tracking-[0.1em] uppercase">
                  ANFRAGE ERHALTEN.
                </p>
                <p className="text-sm text-muted-foreground tracking-[0.08em] leading-[1.7] max-w-[360px] mx-auto">
                  WIR MELDEN UNS INNERHALB VON 24 STUNDEN BEI DIR, UM EINEN TERMIN ZU VEREINBAREN.
                </p>
              </div>
            </FadeSection>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10">
              <FadeSection>
                <p className="text-lg sm:text-xl font-semibold tracking-[0.08em] uppercase text-center leading-[1.5]">
                  STRATEGIE-SESSION ANFRAGEN
                </p>
              </FadeSection>

              <FadeSection>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">
                      NAME *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">
                      E-MAIL *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground tracking-[0.1em] mb-2 uppercase">
                      WAS IST AKTUELL DEIN GRÖSSTES PROBLEM?{' '}
                      <span className="text-muted-foreground/50">(OPTIONAL)</span>
                    </label>
                    <textarea
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </FadeSection>

              <FadeSection>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="w-full border-2 border-foreground px-10 py-5 text-sm sm:text-base tracking-[0.12em] font-bold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  {submitting ? '...' : '→ STRATEGIE-SESSION ANFRAGEN'}
                </button>
              </FadeSection>

              <FadeSection>
                <p className="text-[10px] text-muted-foreground/40 tracking-[0.08em] text-center">
                  KOSTENLOS. KEINE VERPFLICHTUNG.
                </p>
              </FadeSection>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 text-center flex items-center justify-center">
        <BrandMark variant="wordmark" size="sm" align="center" />
      </footer>
    </div>
  );
}
