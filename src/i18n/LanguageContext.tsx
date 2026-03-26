import React, { createContext, useContext } from 'react';
import { de, type Translations } from './de';

interface LanguageContextType {
  language: 'de';
  setLanguage: (lang: string) => void;
  t: Translations;
  dir: 'ltr';
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'de',
  setLanguage: () => {},
  t: de,
  dir: 'ltr',
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <LanguageContext.Provider value={{ language: 'de', setLanguage: () => {}, t: de, dir: 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
