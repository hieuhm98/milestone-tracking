"use client";

// "No Part 3 in source" — two cards in the forecast have no follow-ups, and the
// page says so rather than looking broken.

import { useLang } from "@/context/lang";

export default function NoPart3Badge() {
  const { t } = useLang();

  return (
    <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {t("ielts.badge.noPart3")}
    </p>
  );
}
