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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (showNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">{notFoundMessage || 'Dokument nicht gefunden'}</h1>
          <p className="mt-2 text-gray-500">Dieser Link ist ungültig oder abgelaufen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        {children}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-gray-400">Bereitgestellt über KÖFMAN</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentShell;
