import { ReactNode } from 'react';

interface DocumentShellProps {
  children: ReactNode;
  isLoading?: boolean;
  notFoundMessage?: string;
  showNotFound?: boolean;
}

const DocumentShell = ({ children, isLoading, notFoundMessage, showNotFound }: DocumentShellProps) => {
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    );
  }

  if (showNotFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <h1 className="text-xl font-bold text-gray-900">{notFoundMessage || 'Dokument nicht gefunden'}</h1>
        <p className="mt-2 text-sm text-gray-500">Dieser Link ist ungültig oder abgelaufen.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="mx-auto max-w-[720px] px-4 py-8 md:py-12">
        {children}
        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-[11px] tracking-wide text-gray-400">Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentShell;
