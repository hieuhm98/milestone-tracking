"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth";
import { pushCloudProgress } from "@/lib/cloudProgress";
import { getSupabase } from "@/lib/supabase/client";
import {
  SEED_URL,
  emptyProgress,
  loadLocal,
  mergeProgress,
  normalize,
  saveLocal,
  type ProgressData,
} from "@/lib/progress";

/** Batch rapid answer clicks into a single write-back request. */
const PUSH_DEBOUNCE_MS = 1500;

interface PushOptions {
  /** Survive the tab closing (pagehide). */
  keepalive?: boolean;
  /** "replace" overwrites the server snapshot instead of merging into it. */
  mode?: "merge" | "replace";
}

/** Cross-device sync state for a signed-in, approved account. */
export type CloudSyncState = "off" | "syncing" | "synced" | "error";

interface ProgressContextValue {
  progress: ProgressData;
  /** False until localStorage + the shipped seed have been reconciled. */
  ready: boolean;
  /** True when the host can persist the snapshot back to data/progress.json. */
  writable: boolean;
  lastSyncedAt: string | null;
  cloud: CloudSyncState;
  update: (fn: (prev: ProgressData) => ProgressData) => void;
  /** Overwrite everything (import / reset), syncing the server in replace mode. */
  replaceAll: (data: ProgressData) => Promise<void>;
  reset: () => Promise<void>;
  flush: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressData>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [writable, setWritable] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloud, setCloud] = useState<CloudSyncState>("off");
  const { profile } = useAuth();

  const progressRef = useRef<ProgressData>(emptyProgress());
  const writableRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The approved account progress syncs to, or null when signed out. */
  const cloudUserRef = useRef<string | null>(null);

  /** Take in data from elsewhere (the cloud) without scheduling another push. */
  const adopt = useCallback((next: ProgressData) => {
    progressRef.current = next;
    setProgress(next);
    saveLocal(next);
  }, []);

  const pushCloud = useCallback(
    async (mode: "merge" | "replace" = "merge") => {
      const supabase = getSupabase();
      const userId = cloudUserRef.current;

      if (!supabase || !userId) return;

      setCloud("syncing");

      try {
        const sent = progressRef.current;
        const merged = await pushCloudProgress(supabase, userId, sent, mode);

        // Signed out (or switched account) while the request was in flight.
        if (cloudUserRef.current !== userId) return;

        // Another device's entries came back with the merge — fold them in,
        // keeping anything answered here since the push started.
        if (merged !== sent) adopt(mergeProgress(merged, progressRef.current));

        setCloud("synced");
        setLastSyncedAt(new Date().toISOString());
      } catch {
        if (cloudUserRef.current === userId) setCloud("error");
      }
    },
    [adopt]
  );

  const push = useCallback(async (data: ProgressData, opts: PushOptions = {}) => {
    if (!writableRef.current) return;

    try {
      const res = await fetch(opts.mode === "replace" ? "/api/progress?mode=replace" : "/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: opts.keepalive ?? false,
      });

      if (!res.ok) return;

      const json = await res.json();

      if (json?.persisted) setLastSyncedAt(new Date().toISOString());
    } catch {
      // Offline or read-only host — localStorage already holds the progress.
    }
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    await Promise.all([push(progressRef.current), pushCloud()]);
  }, [push, pushCloud]);

  const commit = useCallback(
    (next: ProgressData) => {
      progressRef.current = next;
      setProgress(next);
      saveLocal(next);

      if (!writableRef.current && !cloudUserRef.current) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void push(progressRef.current);
        void pushCloud();
      }, PUSH_DEBOUNCE_MS);
    },
    [push, pushCloud]
  );

  const update = useCallback(
    (fn: (prev: ProgressData) => ProgressData) => commit(fn(progressRef.current)),
    [commit]
  );

  /**
   * Overwrite the whole snapshot — an import or a reset. Both bypass the
   * debounce and tell the server to replace rather than merge, since a merge
   * would undo the very decision the learner just made.
   */
  const replaceAll = useCallback(
    async (data: ProgressData) => {
      const next = normalize(data);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      progressRef.current = next;
      setProgress(next);
      saveLocal(next);

      await Promise.all([push(next, { mode: "replace" }), pushCloud("replace")]);
    },
    [push, pushCloud]
  );

  const reset = useCallback(() => replaceAll(emptyProgress()), [replaceAll]);

  // Reconcile the three sources on mount: the static seed shipped with the
  // build, the snapshot the server holds on disk, and this browser's storage.
  useEffect(() => {
    let cancelled = false;

    async function fetchJson(url: string): Promise<unknown> {
      try {
        const res = await fetch(url, { cache: "no-store" });

        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    }

    async function init() {
      const stored = loadLocal() ?? emptyProgress();
      const [seedRaw, apiRaw] = await Promise.all([fetchJson(SEED_URL), fetchJson("/api/progress")]);

      if (cancelled) return;

      const seed = seedRaw ? normalize(seedRaw) : emptyProgress();
      const api = apiRaw && typeof apiRaw === "object" ? apiRaw as Record<string, unknown> : null;
      const server = api ? normalize(api.progress) : emptyProgress();
      const canWrite = Boolean(api?.writable);

      // Fold in anything answered while these fetches were in flight, so a fast
      // click during load isn't overwritten by the snapshot we just pulled.
      const local = mergeProgress(stored, progressRef.current);

      // Local goes last so a browser that is ahead of the file wins ties.
      const merged = mergeProgress(mergeProgress(seed, server), local);

      writableRef.current = canWrite;
      progressRef.current = merged;
      setWritable(canWrite);
      setProgress(merged);
      saveLocal(merged);
      setReady(true);

      if (canWrite && merged.updatedAt > server.updatedAt) void push(merged);
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [push]);

  // Don't lose a debounced write when the tab is closed or backgrounded.
  useEffect(() => {
    function handlePageHide() {
      if (!timerRef.current) return;

      clearTimeout(timerRef.current);
      timerRef.current = null;
      void push(progressRef.current, { keepalive: true });
      // Best effort: if the tab dies first, localStorage still holds it and the
      // next load's sign-in sync uploads it.
      void pushCloud();
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      handlePageHide();
    };
  }, [push, pushCloud]);

  // Signing in to an approved account folds this browser's progress into the
  // account (and the account's into this browser); signing out stops syncing
  // but leaves localStorage exactly as it is.
  const profileId = profile?.id ?? null;

  useEffect(() => {
    if (!ready) return;

    cloudUserRef.current = profileId;

    if (!profileId) {
      setCloud("off");

      return;
    }

    void pushCloud();
  }, [ready, profileId, pushCloud]);

  return (
    <ProgressContext.Provider
      value={{ progress, ready, writable, lastSyncedAt, cloud, update, replaceAll, reset, flush }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);

  if (!ctx) throw new Error("useProgress must be used inside a ProgressProvider");

  return ctx;
}
