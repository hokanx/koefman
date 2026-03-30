import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const sections: { id: string; lines: { text: string; muted?: boolean }[] }[] = [
  {
    id: 'context',
    lines: [
      { text: 'DU HAST DEINE ANALYSE GESEHEN.' },
      { text: 'JETZT GEHT ES UM DIE ENTSCHEIDUNG.' },
      { text: 'Was du mit dem Ergebnis machst, bestimmt, was sich ändert.', muted: true },
    ],
  },
  {
    id: 'what',
    lines: [
      { text: 'KÖFMAN BAUT SYSTEME, DIE FUNKTIONIEREN.' },
      { text: 'Wir analysieren, wo dein Unternehmen Geld verliert – und beheben es strukturiert.', muted: true },
    ],
  },
  {
    id: 'clarity',
    lines: [
      { text: 'KEIN COACHING.' },
      { text: 'KEINE THEORIE.' },
      { text: 'KLARE ANALYSE. KLARE UMSETZUNG.', muted: true },
    ],
  },
  {
    id: 'how',
    lines: [
      { text: 'SO FUNKTIONIERT ES.' },
      { text: '1. Wir analysieren dein System.', muted: true },
      { text: '2. Du siehst, wo du verlierst.', muted: true },
      { text: '3. Wir bauen die Lösung.', muted: true },
    ],
  },
  {
    id: 'who',
    lines: [
      { text: 'FÜR UNTERNEHMER, DIE ES ERNST MEINEN.' },
      { text: 'Die nicht mehr raten wollen, sondern wissen.', muted: true },
      { text: 'Die bereit sind, ihr System sauber aufzustellen.', muted: true },
    ],
  },
  {
    id: 'trust',
    lines: [
      { text: 'WIR ARBEITEN NUR MIT WENIGEN GLEICHZEITIG.' },
      { text: 'Jedes Projekt bekommt volle Aufmerksamkeit.', muted: true },
      { text: 'Keine Massenabfertigung. Keine Vorlagen.', muted: true },
    ],
  },
  {
    id: 'decision',
    lines: [
      { text: 'DU KANNST WEITER VERLIEREN.' },
      { text: 'ODER DU FIXST ES JETZT.' },
    ],
  },
];

const SystemPage = () => {
  const navigate = useNavigate();

  const hasCompletedIntake = sessionStorage.getItem('intake_completed') === 'true';
  const goCta = () => navigate(hasCompletedIntake ? '/onboarding' : '/diagnose');

  return (
    <div className="min-h-screen bg-background text-foreground snap-y snap-mandatory overflow-y-auto h-screen">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandMark variant="wordmark" size="md" />
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-muted-foreground tracking-[0.1em] uppercase hover:text-foreground transition-colors"
          >
            Anmelden
          </button>
        </div>
      </nav>

      {/* SECTIONS */}
      {sections.map((section, si) => (
        <section
          key={section.id}
          className={`flex flex-col items-center justify-center px-6 snap-start ${si === 0 ? 'min-h-screen pt-14' : 'min-h-screen py-24 sm:py-32'}`}
        >
          <div className="w-full max-w-[520px] space-y-5 text-center">
            {section.lines.map((line, li) => (
              <FadeSection key={li}>
                <p
                  className={`uppercase tracking-[0.08em] leading-[1.5] ${
                    line.muted
                      ? 'text-sm sm:text-base font-normal text-muted-foreground'
                      : 'text-xl sm:text-2xl font-semibold text-foreground'
                  }`}
                >
                  {line.text}
                </p>
              </FadeSection>
            ))}
          </div>
        </section>
      ))}

      {/* CTA SECTION */}
      <section className="flex flex-col items-center justify-center px-6 min-h-screen py-24 sm:py-32 snap-start">
        <div className="w-full max-w-[520px] space-y-5 text-center">
          <FadeSection>
            <p className="uppercase tracking-[0.08em] leading-[1.5] text-xl sm:text-2xl font-semibold text-foreground">
              BEREIT?
            </p>
          </FadeSection>
          <FadeSection className="pt-10">
            <button
              onClick={goCta}
              className="text-sm sm:text-base tracking-[0.12em] font-semibold text-foreground hover:text-muted-foreground transition-colors uppercase"
            >
              → STRATEGIE-SESSION STARTEN
            </button>
          </FadeSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 text-center snap-start min-h-[50vh] flex items-center justify-center">
        <BrandMark variant="wordmark" size="sm" align="center" />
      </footer>
    </div>
  );
};

export default SystemPage;
