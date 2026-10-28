"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { type Lang, DEFAULT_LANG, translate } from "@/lib/i18n";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /**
   * Side-by-side study mode: learning *content* (articles, questions) is shown
   * in English and Vietnamese at once. `lang` still drives the UI chrome and
   * anything that has room for only one language.
   */
  dual: boolean;
  setDual: (on: boolean) => void;
  toggleDual: () => void;
  /** Translate a UI string key. */
  t: (key: string) => string;
  /** Pick the right value from a bilingual pair (vi value, en value). */
  pick: (vi: string | undefined, en: string | undefined) => string;
}

const LangContext = createContext<LangContextType>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  toggle: () => {},
  dual: false,
  setDual: () => {},
  toggleDual: () => {},
  t: (k) => k,
  pick: (vi) => vi ?? "",
});

const STORAGE_KEY = "lang";
const DUAL_STORAGE_KEY = "lang:dual";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [dual, setDualState] = useState(false);

  // Load persisted preferences on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved === "vi" || saved === "en") setLangState(saved);

    setDualState(window.localStorage.getItem(DUAL_STORAGE_KEY) === "1");
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  // Screen readers pick their voice from <html lang>; keep it in step with the UI.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang(lang === "vi" ? "en" : "vi");
  }, [lang, setLang]);

  const setDual = useCallback((on: boolean) => {
    setDualState(on);
    if (typeof window !== "undefined") window.localStorage.setItem(DUAL_STORAGE_KEY, on ? "1" : "0");
  }, []);

  const toggleDual = useCallback(() => setDual(!dual), [dual, setDual]);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const pick = useCallback(
    (vi: string | undefined, en: string | undefined) => {
      if (lang === "en") return en || vi || "";
      return vi || en || "";
    },
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, dual, setDual, toggleDual, t, pick }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
