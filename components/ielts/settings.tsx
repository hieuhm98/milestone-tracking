"use client";

// Reader settings for the IELTS Speaking section (plan §6.4): show IPA, show
// Band 6, practice mode, text size.
//
// Per-browser display preferences, not progress — so they live in their own
// localStorage keys rather than in ProgressData, exactly like
// lib/useVocabStep.ts. The custom event keeps every mounted reader in sync when
// the toolbar changes something, without a reload and without a provider.

import { useCallback, useEffect, useState } from "react";

export interface ReaderSettings {
  ipa: boolean;
  band6: boolean;
  /** Hide the Band 9 answer (and its analysis) until the learner asks for it. */
  practice: boolean;
  /** Index into FONT_STEPS. */
  font: number;
}

export const SETTINGS_KEY = "ielts:reader";

const CHANGE_EVENT = "ielts:reader-change";

export const DEFAULT_SETTINGS: ReaderSettings = { ipa: true, band6: true, practice: false, font: 1 };

/** Literal classes — the JIT cannot see a size built at runtime. */
export const FONT_STEPS = [
  "text-sm leading-6",
  "text-base leading-7",
  "text-lg leading-8",
  "text-xl leading-9",
] as const;

function read(): ReaderSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);

    if (!raw) return DEFAULT_SETTINGS;

    const saved = JSON.parse(raw) as Partial<ReaderSettings>;

    return {
      ipa: typeof saved.ipa === "boolean" ? saved.ipa : DEFAULT_SETTINGS.ipa,
      band6: typeof saved.band6 === "boolean" ? saved.band6 : DEFAULT_SETTINGS.band6,
      practice: typeof saved.practice === "boolean" ? saved.practice : DEFAULT_SETTINGS.practice,
      font:
        typeof saved.font === "number" && saved.font >= 0 && saved.font < FONT_STEPS.length
          ? saved.font
          : DEFAULT_SETTINGS.font,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * `[settings, update]`. Starts from the defaults so the server and the first
 * client render agree, then adopts the saved values on mount.
 */
export function useReaderSettings(): [ReaderSettings, (patch: Partial<ReaderSettings>) => void] {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

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

  const update = useCallback((patch: Partial<ReaderSettings>) => {
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
