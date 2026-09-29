"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { cn } from "@/lib/utils";

const SYNC_DOT = {
  error: "bg-amber-500",
  syncing: "bg-blue-500 animate-pulse",
  synced: "bg-emerald-500",
  off: "bg-zinc-400",
} as const;

/**
 * Bottom of the sidebar. Deliberately small: a signed-in learner sees their
 * name and whether their progress is safe, and everything else — phone, role,
 * Telegram, sign out — lives on /account, which this links to.
 */
export default function AccountCard({ collapsed = false }: { collapsed?: boolean }) {
  const { enabled, ready, profile, signupTicket, openDialog } = useAuth();
  const { cloud } = useProgress();
  const { t } = useLang();

  if (!enabled || !ready) return null;

  const initial = profile?.full_name?.trim().charAt(0).toUpperCase() || "?";

  if (collapsed) {
    if (!profile) {
      return (
        <button
          type="button"
          onClick={() => openDialog(signupTicket ? "login" : "signup")}
          title={signupTicket ? t("account.login") : t("account.signup")}
          aria-label={signupTicket ? t("account.login") : t("account.signup")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-700 dark:text-amber-300"
        >
          <span aria-hidden="true">☁</span>
        </button>
      );
    }

    return (
      <Link
        href="/account"
        title={`${profile.full_name} · ${t(`account.sync.${cloud}`)}`}
        aria-label={t("account.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
      >
        {initial}
        <span
          aria-hidden="true"
          className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-50 dark:ring-zinc-950", SYNC_DOT[cloud])}
        />
      </Link>
    );
  }

  // This browser already used its one sign-up: nudge towards logging in instead.
  if (!profile && signupTicket) {
    return (
      <div className="m-3 p-3 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-500/10">
        <div className="flex items-start gap-2">
          <span className="text-base leading-5" aria-hidden="true">⏳</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-sky-900 dark:text-sky-200">{t("account.ticketTitle")}</div>
            <p className="text-xs text-sky-800/90 dark:text-sky-200/80 mt-1">{t("account.ticketBody")}</p>
          </div>
        </div>
        <button type="button" onClick={() => openDialog("login")} className="btn-primary w-full whitespace-nowrap text-xs !px-2 !py-1.5 mt-3">
          {t("account.login")}
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="m-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-500/10">
        <div className="flex items-start gap-2">
          <span className="text-base leading-5" aria-hidden="true">☁</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t("account.promptTitle")}</div>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-1">{t("account.promptBodyPlain")}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => openDialog("signup")} className="btn-primary flex-1 whitespace-nowrap text-xs !px-2 !py-1.5">
            {t("account.signup")}
          </button>
          <button type="button" onClick={() => openDialog("login")} className="btn-secondary flex-1 whitespace-nowrap text-xs !px-2 !py-1.5">
            {t("account.login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/account"
      className="m-3 flex items-center gap-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{profile.full_name}</span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            cloud === "error" ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
          )}
        >
          <span aria-hidden="true" className={cn("inline-block h-1.5 w-1.5 rounded-full", SYNC_DOT[cloud])} />
          {t(`account.sync.${cloud}`)}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-zinc-400">›</span>
    </Link>
  );
}
