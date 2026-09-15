"use client";

// Whether mini-lessons end with the English vocabulary step.
//
// A per-browser preference, not progress: it changes what the lesson player
// shows, never what is recorded, so it lives in its own localStorage key rather
// than in ProgressData (which is exported, imported and merged).

import { useCallback, useEffect, useState } from "react";

export const VOCAB_STEP_KEY = "learn:englishVocab";

/** Custom event so every mounted player updates at once, not just on reload. */
const CHANGE_EVENT = "learn:englishVocab-change";

function read(): boolean {
  try {
    return window.localStorage.getItem(VOCAB_STEP_KEY) !== "off";
  } catch {
    return true;
  }
}

/** `[enabled, setEnabled]` — defaults to on, the behaviour before the switch existed. */
export function useVocabStep(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    setEnabledState(read());

    const sync = () => setEnabledState(read());

    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);

    try {
      window.localStorage.setItem(VOCAB_STEP_KEY, next ? "on" : "off");
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, setEnabled];
}
