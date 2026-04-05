import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TruthLandingProps {
  entryLine1: string;
  entryLine2: string;
  entryLine3: string;
  campaignId?: string;
}

interface LineData {
  text: string;
  size?: string;
  weight?: string;
  muted?: boolean;
  delay?: number;
  spacer?: boolean;
}

const FadeInLine = ({ line, index }: { line: LineData; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (line.spacer) return <div className="h-8 sm:h-12" />;

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${line.size} ${line.weight} ${line.muted ? 'text-muted-foreground' : 'text-foreground'}`}
      style={{ transitionDelay: `${(line.delay || index * 150)}ms`, letterSpacing: '0.08em', lineHeight: '1.5' }}
    >
      {line.text}
    </div>
  );
};

export default function TruthLanding({ entryLine1, entryLine2, entryLine3, campaignId }: TruthLandingProps) {
  const navigate = useNavigate();
  const sessionIdRef = useRef<string | null>(null);
  const variant = campaignId || 'direct';

  const sections = [
    {
      id: 'entry',
      lines: [
        { text: entryLine1, size: 'text-2xl sm:text-3xl', weight: 'font-semibold' },
        { text: entryLine2, size: 'text-lg sm:text-xl', weight: 'font-normal', delay: 600 },
        { text: '', spacer: true },
        { text: entryLine3, size: 'text-base', weight: 'font-normal', muted: true, delay: 1200 },
      ],
      fullScreen: true,
    },
    {
      id: 'emotional',
      lines: [
        { text: 'ABER DIESES GEFÜHL KENNST DU.', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
        { text: '', spacer: true },
        { text: 'DA IST ETWAS,', size: 'text-base sm:text-lg', weight: 'font-normal' },
        { text: 'DAS HINTER DEINEM RÜCKEN PASSIERT.', size: 'text-base sm:text-lg', weight: 'font-normal' },
        { text: '', spacer: true },
        { text: 'UND DU SIEHST ES NICHT.', size: 'text-base sm:text-lg', weight: 'font-normal', muted: true },
      ],
    },
    {
      id: 'switch',
      lines: [
        { text: 'GENAU DAS PASSIERT IN DEINEM UNTERNEHMEN.', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
        { text: '', spacer: true },
        { text: 'KUNDEN SPRINGEN AB.', size: 'text-base sm:text-lg', weight: 'font-normal' },
        { text: 'GELD GEHT VERLOREN.', size: 'text-base sm:text-lg', weight: 'font-normal' },
        { text: 'UND DU BEMERKST ES NICHT.', size: 'text-base sm:text-lg', weight: 'font-normal', muted: true },
      ],
    },
    {
      id: 'authority',
      lines: [
        { text: 'DAS PROBLEM IST NICHT DEIN ANGEBOT.', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
        { text: 'DAS PROBLEM IST DEIN SYSTEM.', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
        { text: '', spacer: true },
        { text: 'OHNE SYSTEM VERLIERST DU JEDEN TAG.', size: 'text-base sm:text-lg', weight: 'font-normal', muted: true },
      ],
    },
    {
      id: 'decision',
      lines: [
        { text: 'DU HAST ZWEI OPTIONEN.', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
        { text: '', spacer: true },
        { text: 'DU IGNORIERST ES.', size: 'text-base sm:text-lg', weight: 'font-normal' },
        { text: 'UND VERLIERST WEITER.', size: 'text-base sm:text-lg', weight: 'font-normal', muted: true },
        { text: '', spacer: true },
        { text: 'ODER DU FINDEST HERAUS,', size: 'text-base sm:text-lg', weight: 'font-normal' },
        { text: 'WO DAS PROBLEM LIEGT.', size: 'text-base sm:text-lg', weight: 'font-semibold' },
      ],
    },
    {
      id: 'cta',
      lines: [
        { text: 'FINDE HERAUS,', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
        { text: 'WO DEIN SYSTEM VERSAGT.', size: 'text-xl sm:text-2xl', weight: 'font-semibold' },
      ],
      cta: true,
    },
  ];

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const { data } = await (supabase as any).from('qr_sessions').insert({ campaign_id: variant, converted: false }).select('id').single();
        if (data) sessionIdRef.current = data.id;
      } catch {}
    };
    trackVisit();
  }, [variant]);

  const handleCTA = async () => {
    if (sessionIdRef.current) {
      try {
        await (supabase as any).from('qr_sessions').update({ converted: true }).eq('id', sessionIdRef.current);
        sessionStorage.setItem('qr_session_id', sessionIdRef.current);
      } catch {}
    }
    navigate(`/diagnose?v=${variant}`);
  };

  return (
    <div className="bg-background text-foreground min-h-screen snap-y snap-mandatory overflow-y-auto h-screen">
      {sections.map((section) => (
        <section
          key={section.id}
          className={`flex flex-col items-center justify-center px-6 snap-start ${section.fullScreen ? 'min-h-screen' : 'min-h-screen py-24 sm:py-32'}`}
        >
          <div className="w-full max-w-[480px] space-y-4 text-center">
            {section.lines.map((line, li) => (
              <FadeInLine key={li} line={line} index={li} />
            ))}
            {section.cta && (
              <div className="pt-12 space-y-6">
                <button
                  onClick={handleCTA}
                  className="border border-foreground px-8 py-4 text-sm tracking-[0.12em] font-semibold text-foreground bg-transparent hover:bg-foreground hover:text-background transition-colors duration-300 uppercase"
                >
                  [ KOSTENLOSE ANALYSE STARTEN ]
                </button>
                <p className="text-xs text-muted-foreground tracking-[0.1em]">
                  DAUERT 2 MINUTEN. KEINE VERPFLICHTUNG.
                </p>
              </div>
            )}
          </div>
        </section>
      ))}
      <footer className="py-16 text-center snap-start min-h-[50vh] flex items-center justify-center">
        <p className="text-xs text-muted-foreground tracking-[0.12em]">KÖFMAN</p>
      </footer>
    </div>
  );
}
