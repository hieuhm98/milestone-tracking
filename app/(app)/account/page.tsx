"use client";

// Everything about the signed-in account. The sidebar card deliberately shows
// only a name and whether progress is safe; the details live here.

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

const SYNC_DOT = {
  error: "bg-amber-500",
  syncing: "bg-blue-500 animate-pulse",
  synced: "bg-emerald-500",
  off: "bg-zinc-400",
} as const;

export default function AccountPage() {
  const { enabled, ready, profile, telegramEnabled, signOut, telegramLink, disconnectTelegram, refreshProfile, openDialog } =
    useAuth();
  const { cloud, lastSyncedAt } = useProgress();
  const { t, lang, pick } = useLang();
  const [linking, setLinking] = useState(false);
  const [telegramError, setTelegramError] = useState(false);

  // The chat id arrives via the webhook while the learner is in Telegram, so
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

  async function handleConnect() {
    setTelegramError(false);

    // Open the tab inside the click so popup blockers allow it, then point it
    // at the deep link once the server has issued one.
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

  if (!ready) return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;

  if (!enabled) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">{t("account.title")}</h1>
        <p className="text-sm text-zinc-500 mt-2">{t("auth.error.not_configured")}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">{t("account.title")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{t("account.promptBodyPlain")}</p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => openDialog("signup")} className="btn-primary">
            {t("account.signup")}
          </button>
          <button type="button" onClick={() => openDialog("login")} className="btn-secondary">
            {t("account.login")}
          </button>
        </div>
      </div>
    );
  }

  const syncedAt = lastSyncedAt
    ? new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(lastSyncedAt)
      )
    : null;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("account.title")}</h1>

      <div className="card">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-lg font-semibold text-zinc-700 dark:text-zinc-200"
          >
            {profile.full_name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold truncate">{profile.full_name}</div>
            <div className="text-sm text-zinc-500">{formatPhone(profile.phone)}</div>
          </div>
          <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded", ROLE_BADGE[profile.role])}>
            {t(`account.role.${profile.role}`)}
          </span>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold">{t("account.syncTitle")}</h2>
        <p className={cn("flex items-center gap-1.5 text-sm mt-2", cloud === "error" ? "text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400")}>
          <span aria-hidden="true" className={cn("inline-block h-2 w-2 rounded-full", SYNC_DOT[cloud])} />
          {t(`account.sync.${cloud}`)}
        </p>
        {syncedAt && <p className="text-xs text-zinc-500 mt-1">{t("account.lastSynced")}: {syncedAt}</p>}
        <p className="text-xs text-zinc-500 mt-2">{t("account.syncHint")}</p>
      </div>

      {/* Telegram is optional — no bot configured, nothing to show. */}
      {(telegramEnabled || profile.telegram_chat_id) && (
        <div className="card">
          <h2 className="text-sm font-semibold">Telegram</h2>

          {profile.telegram_chat_id ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">✈ {t("account.telegramConnected")}</p>
              <button type="button" onClick={() => void disconnectTelegram()} className="btn-secondary mt-3 text-sm">
                {t("account.telegramDisconnect")}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{t("account.telegramHint")}</p>
              <button type="button" onClick={() => void handleConnect()} className="btn-primary mt-3 text-sm">
                ✈ {t("account.telegramConnect")}
              </button>
            </>
          )}

          {telegramError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{t("account.telegramError")}</p>}
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold">{t("account.sessionTitle")}</h2>
        <p className="text-xs text-zinc-500 mt-1">
          {pick(
            "Đăng xuất chỉ dừng đồng bộ trên thiết bị này; tiến độ vẫn được giữ trong trình duyệt.",
            "Signing out only stops syncing on this device; your progress stays in this browser."
          )}
        </p>
        <button type="button" onClick={() => void signOut()} className="btn-secondary mt-3 text-sm">
          {t("account.signOut")}
        </button>
      </div>
    </div>
  );
}
