import React, { createContext, useContext, useState } from 'react';

interface ImpersonatedUser {
  id: string;
  email: string;
  businessName: string;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  effectiveUserId: string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode; realUserId: string | null }> = ({ children, realUserId }) => {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  const startImpersonation = (user: ImpersonatedUser) => setImpersonatedUser(user);
  const stopImpersonation = () => setImpersonatedUser(null);

  return (
    <ImpersonationContext.Provider value={{
      impersonatedUser,
      isImpersonating: !!impersonatedUser,
      startImpersonation,
      stopImpersonation,
      effectiveUserId: impersonatedUser?.id ?? realUserId,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (!context) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return context;
};
