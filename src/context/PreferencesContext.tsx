import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  formatPriceAmount,
  formatPriceText,
  formatStartingPrice,
  type CurrencyCode,
} from '../lib/currency.ts';
import { TRANSLATIONS, type LanguageCode, type TranslationStrings } from '../lib/i18n.ts';

interface PreferencesContextValue {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  toggleCurrency: () => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TranslationStrings;
  formatAmount: (amountAed: number) => string;
  formatStarting: (amountAed: number | null, fallbackNote: string, prefix?: string) => string;
  formatText: (text: string) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('ta_currency');
      return saved === 'USD' ? 'USD' : 'AED';
    } catch {
      return 'AED';
    }
  });

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('ta_language');
      if (saved === 'ar' || saved === 'ur') return saved;
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      localStorage.setItem('ta_currency', next);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === 'AED' ? 'USD' : 'AED');
  }, [currency, setCurrency]);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    try {
      localStorage.setItem('ta_language', next);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const formatAmount = useCallback(
    (amountAed: number) => formatPriceAmount(amountAed, currency),
    [currency]
  );

  const formatStarting = useCallback(
    (amountAed: number | null, fallbackNote: string, prefix = 'From') =>
      formatStartingPrice(amountAed, fallbackNote, currency, prefix),
    [currency]
  );

  const formatText = useCallback(
    (text: string) => formatPriceText(text, currency),
    [currency]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      currency,
      setCurrency,
      toggleCurrency,
      language,
      setLanguage,
      t: TRANSLATIONS[language],
      formatAmount,
      formatStarting,
      formatText,
    }),
    [currency, setCurrency, toggleCurrency, language, setLanguage, formatAmount, formatStarting, formatText]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
