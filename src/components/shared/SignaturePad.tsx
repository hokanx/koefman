import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  clearLabel: string;
  instructionLabel: string;
}

const SignaturePad = ({ onSignatureChange, clearLabel, instructionLabel }: SignaturePadProps) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setIsEmpty(false);
      onSignatureChange(sigRef.current.getTrimmedCanvas().toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange(null);
  };

  // Resize canvas to fit container
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current || !sigRef.current) return;
      const canvas = sigRef.current.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const w = containerRef.current.offsetWidth;
      const h = containerRef.current.offsetHeight;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sigRef.current.clear();
      setIsEmpty(true);
      onSignatureChange(null);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{instructionLabel}</p>
      <div
        ref={containerRef}
        className="relative w-full rounded-lg border-2 border-dashed border-gray-300 bg-white"
        style={{ height: '160px', touchAction: 'none' }}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="#1a1a2e"
          minWidth={1.5}
          maxWidth={3}
          onEnd={handleEnd}
          canvasProps={{
            className: 'w-full h-full rounded-lg',
          }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-300 select-none">✍️</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        {clearLabel}
      </button>
    </div>
  );
};

export default SignaturePad;
