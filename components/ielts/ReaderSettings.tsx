"use client";

// The reader toolbar (plan §6.4). Every choice is written to localStorage and
// broadcast, so a page opened later — or another block on this page — starts
// from the same settings.

import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { FONT_STEPS, useReaderSettings } from "./settings";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-1.5 text-sm text-zinc-700 dark:text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
      />
      <span>{label}</span>
    </label>
  );
}

export default function ReaderSettings() {
  const { t } = useLang();
  const [settings, update] = useReaderSettings();

  const step = (delta: number) => {
    const next = Math.min(FONT_STEPS.length - 1, Math.max(0, settings.font + delta));

    update({ font: next });
  };

  return (
    <div className="w-64 max-w-[80vw]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {t("ielts.settings.title")}
      </p>

      <Toggle label={t("ielts.settings.ipa")} checked={settings.ipa} onChange={(next) => update({ ipa: next })} />
      <Toggle label={t("ielts.settings.band6")} checked={settings.band6} onChange={(next) => update({ band6: next })} />
      <Toggle
        label={t("ielts.settings.practice")}
        checked={settings.practice}
        onChange={(next) => update({ practice: next })}
      />

      <div className="mt-2 flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
        <span className="text-sm text-zinc-700 dark:text-zinc-200">{t("ielts.settings.fontSize")}</span>

        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={settings.font === 0}
            aria-label="A−"
            className={cn(
              "h-7 w-7 rounded-md border border-zinc-300 text-sm dark:border-zinc-700",
              settings.font === 0
                ? "text-zinc-300 dark:text-zinc-600"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            )}
          >
            A−
          </button>
          <span className="w-8 text-center text-xs text-zinc-500 dark:text-zinc-400">{settings.font + 1}/{FONT_STEPS.length}</span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={settings.font === FONT_STEPS.length - 1}
            aria-label="A+"
            className={cn(
              "h-7 w-7 rounded-md border border-zinc-300 text-sm dark:border-zinc-700",
              settings.font === FONT_STEPS.length - 1
                ? "text-zinc-300 dark:text-zinc-600"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            )}
          >
            A+
          </button>
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t("ielts.phrase.tooltipHint")}</p>
    </div>
  );
}
