import { ReactNode } from 'react';

interface DocumentShellProps {
  children: ReactNode;
  isLoading?: boolean;
  notFoundMessage?: string;
  showNotFound?: boolean;
}

/**
 * Wraps public document views in a light-themed container that overrides
 * the app's dark default (body has bg-background which is black).
 */
const DocumentShell = ({ children, isLoading, notFoundMessage, showNotFound }: DocumentShellProps) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    color: '#111827',
    minHeight: '100vh',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={baseStyle}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (showNotFound) {
    return (
      <div className="flex flex-col items-center justify-center px-4" style={baseStyle}>
        <h1 className="text-xl font-bold" style={{ color: '#111827', textTransform: 'none' }}>{notFoundMessage || 'Dokument nicht gefunden'}</h1>
        <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>Dieser Link ist ungültig oder abgelaufen.</p>
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="mx-auto max-w-[720px] px-4 py-8 md:py-12 space-y-6" style={{ textTransform: 'none' }}>
        {children}
        <div className="mt-10 text-center">
          <p className="text-[11px] tracking-wide" style={{ color: '#9ca3af' }}>Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentShell;
