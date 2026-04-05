import { useRef, useState, useEffect } from 'react';

interface FadeSectionProps {
  children: React.ReactNode;
  className?: string;
  /** IntersectionObserver threshold (default 0.25) */
  threshold?: number;
  /** Transition delay in ms */
  delay?: number;
}

const FadeSection = ({ children, className = '', threshold = 0.25, delay }: FadeSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
};

export default FadeSection;
