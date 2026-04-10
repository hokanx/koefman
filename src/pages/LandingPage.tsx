import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import BrandMark from '@/components/shared/BrandMark';
import LegalFooter from '@/components/shared/LegalFooter';
import FadeSection from '@/components/ui/FadeSection';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [scrollHintVisible, setScrollHintVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrollHintVisible(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Homescreen / standalone launch → go straight to login
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    if (isStandalone && !user && !loading) {
      navigate('/login', { replace: true });
      return;
    }
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
          className={`relative flex flex-col items-center justify-center px-6 snap-start ${si === 0 ? 'min-h-screen pt-14' : 'min-h-screen py-24 sm:py-32'}`}
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
          {si < sections.length - 1 && (
            <>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
              <div className={`absolute bottom-14 left-1/2 -translate-x-1/2 animate-bounce transition-opacity duration-500 ${scrollHintVisible ? 'opacity-50' : 'opacity-0'}`}>
                <ChevronDown className="h-5 w-5 text-foreground" />
              </div>
            </>
          )}
        </section>
      ))}

      {/* FOOTER */}
      <footer className="py-16 text-center snap-start min-h-[50vh] flex flex-col items-center justify-center gap-6">
        <BrandMark variant="wordmark" size="sm" align="center" />
        <LegalFooter />
      </footer>
    </div>
  );
};

export default LandingPage;
