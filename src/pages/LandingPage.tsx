import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  // Also used as root "/" — ensure it works for public visitors

  const goIntake = () => navigate('/diagnose');

  const sections: { id: string; lines: { text: string; muted?: boolean }[]; cta?: boolean }[] = [
    {
      id: 'hook',
      lines: [
        { text: 'DEIN PROBLEM IST NICHT DEIN ANGEBOT.' },
        { text: 'ES IST DEIN SYSTEM.' },
        { text: 'Du verlierst gerade Anfragen oder Umsatz.', muted: true },
        { text: 'Und du merkst es nicht einmal.', muted: true },
      ],
      cta: true,
    },
    {
      id: 'diagnosis',
      lines: [
        { text: 'DIE MEISTEN UNTERNEHMER SUCHEN NACH MEHR KUNDEN.' },
        { text: 'DAS IST NICHT DAS PROBLEM.', muted: true },
      ],
    },
    {
      id: 'recognition',
      lines: [
        { text: 'DEIN ABLAUF IST NICHT SAUBER.' },
        { text: 'DEINE STRUKTUR FEHLT.' },
        { text: 'DEIN SYSTEM VERLIERT GELD.', muted: true },
      ],
    },
    {
      id: 'reframe',
      lines: [
        { text: 'ES GEHT NICHT DARUM, MEHR ZU TUN.' },
        { text: 'ES GEHT DARUM, DAS RICHTIGE SAUBER ZU MACHEN.' },
      ],
    },
    {
      id: 'positioning',
      lines: [
        { text: 'WIR FINDEN HERAUS, WO DEIN SYSTEM VERSAGT.' },
        { text: 'UND ZEIGEN DIR, WIE DU ES BEHEBST.', muted: true },
      ],
    },
    {
      id: 'proof',
      lines: [
        { text: 'KEINE THEORIE.' },
        { text: 'KEIN COACHING.' },
        { text: 'EINE KLARE ANALYSE. FÜR DEIN UNTERNEHMEN.' },
      ],
    },
    {
      id: 'decision',
      lines: [
        { text: 'DU KANNST WEITER RATEN.' },
        { text: 'ODER DU FINDEST ES HERAUS.' },
      ],
    },
    {
      id: 'cta',
      lines: [
        { text: 'FINDE HERAUS, WO DU VERLIERST.' },
      ],
      cta: true,
    },
  ];

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
            {section.cta && (
              <FadeSection className="pt-10">
                <button
                  onClick={goIntake}
                  className="text-sm sm:text-base tracking-[0.12em] font-semibold text-foreground hover:text-muted-foreground transition-colors uppercase"
                >
                  → KOSTENLOSE ANALYSE STARTEN
                </button>
              </FadeSection>
            )}
          </div>
        </section>
      ))}

      {/* FOOTER */}
      <footer className="py-16 text-center snap-start min-h-[50vh] flex items-center justify-center">
        <BrandMark variant="wordmark" size="sm" align="center" />
      </footer>
    </div>
  );
};

export default LandingPage;
