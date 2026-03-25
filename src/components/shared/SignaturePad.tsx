import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  onSignatureStateChange?: (hasSignature: boolean) => void;
  clearLabel: string;
  instructionLabel: string;
}

const SignaturePad = ({ onSignatureChange, onSignatureStateChange, clearLabel, instructionLabel }: SignaturePadProps) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const emitEmptyState = () => {
    setIsEmpty(true);
    onSignatureChange(null);
    onSignatureStateChange?.(false);
  };

  const syncSignatureState = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      emitEmptyState();
      return;
    }

    const trimmedCanvas = sigRef.current.getTrimmedCanvas();
    if (!trimmedCanvas || trimmedCanvas.width === 0 || trimmedCanvas.height === 0) {
      emitEmptyState();
      return;
    }

    const dataUrl = trimmedCanvas.toDataURL('image/png');
    if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 200) {
      emitEmptyState();
      return;
    }

    setIsEmpty(false);
    onSignatureChange(dataUrl);
    onSignatureStateChange?.(true);
  };

  const handleEnd = () => {
    window.requestAnimationFrame(syncSignatureState);
  };

  const handleClear = () => {
    sigRef.current?.clear();
    emitEmptyState();
  };

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
      emitEmptyState();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700">{instructionLabel}</p>
      <div
        ref={containerRef}
        onPointerUpCapture={handleEnd}
        className="relative w-full rounded-lg border-2 border-dashed border-gray-300 bg-white shadow-sm"
        style={{ height: '160px', touchAction: 'none' }}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="#1a1a1a"
          backgroundColor="rgba(255,255,255,0)"
          minWidth={1.5}
          maxWidth={3}
          onEnd={handleEnd}
          canvasProps={{
            className: 'absolute inset-0 w-full h-full rounded-lg',
            style: { zIndex: 2 },
          }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="select-none text-sm text-muted-foreground/60">✍️</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-blue-600"
      >
        {clearLabel}
      </button>
    </div>
  );
};

export default SignaturePad;
