"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

const ROLE_BADGE = {
  admin: "bg-rose-100 dark:bg-rose-600/20 text-rose-700 dark:text-rose-300",
  teacher: "bg-violet-100 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300",
  learner: "bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300",
} as const;

/**
 * Bottom of the sidebar: a sign-up nudge for guests, or the signed-in account
 * with its sync state and Telegram link. Hidden when accounts aren't configured.
 */
export default function AccountCard() {
  const { enabled, ready, profile, signupTicket, openDialog, signOut, telegramLink, disconnectTelegram, refreshProfile } =
    useAuth();
  const { cloud } = useProgress();
  const { t } = useLang();
  const [linking, setLinking] = useState(false);
  const [telegramError, setTelegramError] = useState(false);

  // The chat id lands via the webhook while the learner is in Telegram, so
  // re-read the profile when they come back to this tab.
  const awaitingTelegram = linking && profile && !profile.telegram_chat_id;

  useEffect(() => {
    if (!awaitingTelegram) return;

    function onFocus() {
      void refreshProfile();
    }

    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [awaitingTelegram, refreshProfile]);

  if (!enabled || !ready) return null;

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
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-1">{t("account.promptBody")}</p>
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

  async function handleConnect() {
    setTelegramError(false);

    // Open the tab synchronously, inside the click, so popup blockers allow it;
    // point it at the deep link once the server has issued one.
    const tab = window.open("", "_blank");
    const url = await telegramLink();

    if (!url) {
      tab?.close();
      setTelegramError(true);

      return;
    }

    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.href = url;
    }

    setLinking(true);
  }

  const syncLabel =
    cloud === "syncing" ? t("account.syncing") : cloud === "error" ? t("account.syncError") : t("account.synced");

  return (
    <div className="m-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{profile.full_name}</div>
          <div className="text-xs text-zinc-500 truncate">{formatPhone(profile.phone)}</div>
        </div>
        <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded", ROLE_BADGE[profile.role])}>
          {t(`account.role.${profile.role}`)}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center gap-1.5 text-xs mt-2",
          cloud === "error" ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full",
            cloud === "error" ? "bg-amber-500" : cloud === "syncing" ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
          )}
        />
        {syncLabel}
      </div>

      {profile.telegram_chat_id ? (
        <div className="flex items-center justify-between gap-2 text-xs mt-2 text-zinc-600 dark:text-zinc-400">
          <span className="truncate">✈ {t("account.telegramConnected")}</span>
          <button
            type="button"
            onClick={() => void disconnectTelegram()}
            className="shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline py-2 -my-2"
          >
            {t("account.telegramDisconnect")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleConnect()}
          className="w-full mt-2 text-xs font-medium py-1.5 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
        >
          ✈ {t("account.telegramConnect")}
        </button>
      )}

      {telegramError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t("account.telegramError")}</p>}

      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full mt-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 py-1.5"
      >
        {t("account.signOut")}
      </button>
    </div>
  );
}
