"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth";
import { useLang } from "@/context/lang";
import { useTheme } from "@/context/theme";
import { AuthForm } from "@/components/auth/AuthForm";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { LANGS } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Whether the site is closed to visitors. Set NEXT_PUBLIC_REQUIRE_LOGIN=0 to
 * open it up again. Without Supabase there is nothing to log in to, so the
 * site stays public rather than locking everyone — including local dev — out.
 */
export const REQUIRE_LOGIN = isSupabaseConfigured && process.env.NEXT_PUBLIC_REQUIRE_LOGIN !== "0";

/**
 * Nothing but the sign-in screen until an approved account is signed in.
 * This hides the app, not the content API routes — see local-docs.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, profile } = useAuth();

  if (!REQUIRE_LOGIN || profile) return <>{children}</>;

  // Don't flash the sign-in screen at someone who is already signed in.
  if (!ready) return <Splash />;

  return <SignInScreen />;
}

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="font-bold text-lg tracking-tight">Milestone Tracking</div>
        <div className="mt-3 text-sm text-zinc-500" role="status">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" /> …
        </div>
      </div>
    </div>
  );
}

function SignInScreen() {
  const { lang, setLang, t } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <header className="text-center">
        <h1 className="font-bold text-2xl tracking-tight">Milestone Tracking</h1>
        <p className="text-sm text-zinc-500 mt-1">IT · AWS · English</p>
      </header>

      <div className="card w-full max-w-sm shadow-sm">
        <AuthForm mode={mode} onSwitchMode={setMode} hint={t("auth.loginHintRequired")} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                lang === l.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {l.short}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
          className="text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
    </div>
  );
}
