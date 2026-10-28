"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth";

// The learner's personal X-Sandbox-Key, shared by /practice/api (Scalar) and
// the web store at /practice/api/web — so both talk to the same sandbox, and an
// order placed in the store shows up when you call GET /orders from Scalar.
//
// From the account when signed in (same sandbox on every device), otherwise —
// only while the site is public — from a random id this browser keeps.

const BROWSER_ID_KEY = "sandbox:browserId";

function browserId(): string {
  try {
    let id = window.localStorage.getItem(BROWSER_ID_KEY);

    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(BROWSER_ID_KEY, id);
    }

    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export interface SandboxKeyState {
  key: string | null;
  scope: "account" | "browser" | null;
  /** Why no key could be issued (e.g. "login_required"), or null. */
  error: string | null;
}

export interface SandboxKey extends SandboxKeyState {
  /** Ask for the key again, e.g. after a network error. */
  retry: () => void;
}

export function useSandboxKey(): SandboxKey {
  const { session, ready } = useAuth();
  const [state, setState] = useState<SandboxKeyState>({ key: null, scope: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    setState((prev) => (prev.error ? { ...prev, error: null } : prev));

    async function load() {
      try {
        const res = await fetch("/api/sandbox/key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ browserId: browserId() }),
        });
        const json = await res.json().catch(() => null);

        if (cancelled) return;

        if (res.ok && typeof json?.key === "string") {
          setState({ key: json.key, scope: json.scope, error: null });
        } else {
          setState({ key: null, scope: null, error: json?.error ?? `HTTP ${res.status}` });
        }
      } catch {
        if (!cancelled) setState({ key: null, scope: null, error: "network" });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [ready, session?.access_token, attempt]);

  return { ...state, retry };
}
