"use client";

// Reader settings for the Grammar for Writing section (plan §5.3): text size,
// "hide answers (for teaching)" and "show Extend sections".
//
// Per-browser display preferences, not progress — so they live in their own
// localStorage key rather than in ProgressData, exactly like
// components/ielts/settings.tsx. The custom event keeps every mounted block in
// sync when the toolbar changes something, without a reload and without a
// provider.

import { useCallback, useEffect, useState } from "react";

export interface GrammarSettings {
  /** Index into FONT_STEPS. */
  font: number;
  /** Teacher projecting: never reveal an answer or a model. */
  hideAnswers: boolean;
  /** Offer the Extend layer at all. */
  showExtend: boolean;
}

export const SETTINGS_KEY = "grammar:reader";

const CHANGE_EVENT = "grammar:reader-change";

export const DEFAULT_SETTINGS: GrammarSettings = { font: 1, hideAnswers: false, showExtend: true };

/** Literal classes — the JIT cannot see a size built at runtime. */
export const FONT_STEPS = [
  "text-sm leading-6",
  "text-base leading-7",
  "text-lg leading-8",
  "text-xl leading-9",
] as const;

function read(): GrammarSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);

    if (!raw) return DEFAULT_SETTINGS;

    const saved = JSON.parse(raw) as Partial<GrammarSettings>;

    return {
      font:
        typeof saved.font === "number" && saved.font >= 0 && saved.font < FONT_STEPS.length
          ? saved.font
          : DEFAULT_SETTINGS.font,
      hideAnswers: typeof saved.hideAnswers === "boolean" ? saved.hideAnswers : DEFAULT_SETTINGS.hideAnswers,
      showExtend: typeof saved.showExtend === "boolean" ? saved.showExtend : DEFAULT_SETTINGS.showExtend,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * `[settings, update]`. Starts from the defaults so the server and the first
 * client render agree, then adopts the saved values on mount.
 */
export function useGrammarSettings(): [GrammarSettings, (patch: Partial<GrammarSettings>) => void] {
  const [settings, setSettings] = useState<GrammarSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(read());

    const sync = () => setSettings(read());

    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const update = useCallback((patch: Partial<GrammarSettings>) => {
    const next = { ...read(), ...patch };

    setSettings(next);

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: the choice still holds for this visit.
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [settings, update];
}
