"use client";

// Whether the desktop rail is minimised to icons.
//
// A per-browser display preference, not progress, so it lives in its own
// localStorage key like `lib/useVocabStep.ts` and the reader settings. The
// custom event keeps both copies of the nav (rail and drawer) in step without
// a provider.

import { useCallback, useEffect, useState } from "react";

const KEY = "sidebar:collapsed";
const CHANGE_EVENT = "sidebar:collapsed-change";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  // Always start expanded so the server and the first client render agree;
  // the stored value is applied right after mount.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(read());

    function sync() {
      setCollapsed(read());
    }

    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((value: boolean) => {
    setCollapsed(value);

    try {
      window.localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      // Private mode — the choice just won't survive this session.
    }

    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [collapsed, update];
}
