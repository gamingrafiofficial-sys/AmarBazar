import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, formatBDT } from '../lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  formatBDT: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('amarbazaar_lang') as Language;
    // Default to English as explicitly requested
    return saved === 'bn' ? 'bn' : 'en';
  });

  // Ensure default is English on startup if not explicitly set
  useEffect(() => {
    const saved = localStorage.getItem('amarbazaar_lang');
    if (!saved) {
      localStorage.setItem('amarbazaar_lang', 'en');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('amarbazaar_lang', lang);
  };

  const t = (key: keyof typeof translations['en']): string => {
    return translations[language][key] || translations['en'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatBDT }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
