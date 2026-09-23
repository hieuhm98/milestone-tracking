"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizePhone, phoneToLoginEmail } from "@/lib/phone";
import { useLang } from "@/context/lang";
import AuthDialog from "@/components/auth/AuthDialog";

export type AccountRole = "admin" | "teacher" | "learner";
export type AccountStatus = "draft" | "active" | "disabled";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: AccountRole;
  status: AccountStatus;
  telegram_chat_id: number | null;
}

/** Which account dialog is open. `pending` / `disabled` explain why sign-in stopped. */
export type AuthDialogMode = "signup" | "login" | "pending" | "disabled";

export type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  /** False when the Supabase env vars are missing — every account surface hides. */
  enabled: boolean;
  /** False until the stored session (if any) has been checked. */
  ready: boolean;
  session: Session | null;
  /** Set only for an approved (`active`) account. */
  profile: Profile | null;
  /** Set once this browser has signed up; further sign-ups are refused. */
  signupTicket: SignupTicket | null;
  /** True only when the server has a bot token — Telegram is optional. */
  telegramEnabled: boolean;
  dialog: AuthDialogMode | null;
  openDialog: (mode: AuthDialogMode) => void;
  closeDialog: () => void;
  signUp: (input: { fullName: string; phone: string; password: string }) => Promise<AuthResult>;
  signIn: (phone: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Returns the t.me deep link that connects this account's Telegram chat. */
  telegramLink: () => Promise<string | null>;
  disconnectTelegram: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS = "id, full_name, phone, role, status, telegram_chat_id";

/** One sign-up per browser: set after a successful sign-up, never cleared by the app. */
const SIGNUP_TICKET_KEY = "auth:signupTicket";

export interface SignupTicket {
  fullName: string;
  at: string;
}

function loadTicket(): SignupTicket | null {
  try {
    const raw = window.localStorage.getItem(SIGNUP_TICKET_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    return parsed && typeof parsed.at === "string" ? { fullName: String(parsed.fullName ?? ""), at: parsed.at } : null;
  } catch {
    return null;
  }
}

function saveTicket(ticket: SignupTicket): void {
  try {
    window.localStorage.setItem(SIGNUP_TICKET_KEY, JSON.stringify(ticket));
  } catch {
    // Private mode / quota — the limit just won't stick in this browser.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dialog, setDialog] = useState<AuthDialogMode | null>(null);
  const [signupTicket, setSignupTicket] = useState<SignupTicket | null>(null);

  const [telegramEnabled, setTelegramEnabled] = useState(false);

  useEffect(() => setSignupTicket(loadTicket()), []);

  // Which optional pieces the server actually has. Accounts can run without a
  // bot; the Telegram button stays hidden until one is configured.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    fetch("/api/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setTelegramEnabled(Boolean(json?.telegram));
      })
      .catch(() => {
        // Leave it off — a missing probe shouldn't offer a button that 503s.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A browser that already signed up gets the approval notice, not a second form.
  const openDialog = useCallback(
    (mode: AuthDialogMode) => setDialog(mode === "signup" && loadTicket() ? "pending" : mode),
    []
  );

  /**
   * Load the profile behind a session. Anything but `active` ends the session
   * on the spot: a draft or disabled account must not stay signed in, and RLS
   * would refuse its progress reads anyway.
   */
  const adoptSession = useCallback(async (next: Session | null): Promise<AccountStatus | null> => {
    const supabase = getSupabase();

    if (!supabase || !next) {
      setSession(null);
      setProfile(null);

      return null;
    }

    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", next.user.id).maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);

      return null;
    }

    const loaded = data as Profile;

    if (loaded.status !== "active") {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);

      return loaded.status;
    }

    setSession(next);
    setProfile(loaded);

    return "active";
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase) return;

    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;

      await adoptSession(data.session);

      if (!cancelled) setReady(true);
    });

    // Token refreshes swap the session object; keep ours current. Sign-in is
    // handled by signIn() itself so the status check runs exactly once.
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED" && next) setSession(next);

      if (event === "SIGNED_OUT") {
        setSession(null);
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [adoptSession]);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async ({ fullName, phone, password }) => {
      if (loadTicket()) {
        setDialog("pending");

        return { ok: false, error: "already_signed_up" };
      }

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, phone, password, lang }),
        });

        if (res.ok) {
          const ticket = { fullName: fullName.trim(), at: new Date().toISOString() };

          saveTicket(ticket);
          setSignupTicket(ticket);
          setDialog("pending");

          return { ok: true };
        }

        const json = await res.json().catch(() => null);

        // Deploy-time problem, not a user error — name the variables in the
        // console so it can be fixed without reading server logs.
        if (Array.isArray(json?.missing) && json.missing.length > 0) {
          console.error("[signup] server is missing env vars:", json.missing.join(", "));
        }

        return { ok: false, error: json?.error ?? "signup_failed" };
      } catch {
        return { ok: false, error: "network" };
      }
    },
    [lang]
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (phone, password) => {
      const supabase = getSupabase();
      const normalized = normalizePhone(phone);

      if (!supabase) return { ok: false, error: "not_configured" };

      if (!normalized) return { ok: false, error: "invalid_phone" };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneToLoginEmail(normalized),
        password,
      });

      if (error || !data.session) return { ok: false, error: "invalid_credentials" };

      const status = await adoptSession(data.session);

      if (status === "active") {
        setDialog(null);

        return { ok: true };
      }

      if (status === "draft") {
        setDialog("pending");
      } else if (status === "disabled") {
        setDialog("disabled");
      }

      return { ok: false, error: status ?? "signin_failed" };
    },
    [adoptSession]
  );

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();

    if (!supabase) return;

    const { data } = await supabase.auth.getSession();

    await adoptSession(data.session);
  }, [adoptSession]);

  const authedFetch = useCallback(
    (url: string, method: "POST" | "DELETE") =>
      fetch(url, { method, headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } }),
    [session]
  );

  const telegramLink = useCallback(async () => {
    try {
      const res = await authedFetch("/api/telegram/link", "POST");
      const json = await res.json().catch(() => null);

      return res.ok && typeof json?.url === "string" ? json.url : null;
    } catch {
      return null;
    }
  }, [authedFetch]);

  const disconnectTelegram = useCallback(async () => {
    await authedFetch("/api/telegram/link", "DELETE").catch(() => null);
    await refreshProfile();
  }, [authedFetch, refreshProfile]);

  const value: AuthContextValue = {
    enabled: isSupabaseConfigured,
    ready,
    session,
    profile,
    signupTicket,
    telegramEnabled,
    dialog,
    openDialog,
    closeDialog: () => setDialog(null),
    signUp,
    signIn,
    signOut,
    refreshProfile,
    telegramLink,
    disconnectTelegram,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isSupabaseConfigured && <AuthDialog />}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");

  return ctx;
}
