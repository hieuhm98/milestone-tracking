"use client";

// The reader toolbar (plan §5.3). Every choice is written to localStorage and
// broadcast, so a page opened later — or another block on this page — starts
// from the same settings.

import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { FONT_STEPS, useGrammarSettings } from "./settings";

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
  const { t, pick } = useLang();
  const [settings, update] = useGrammarSettings();

  const step = (delta: number) => {
    const next = Math.min(FONT_STEPS.length - 1, Math.max(0, settings.font + delta));

    update({ font: next });
  };

  return (
    <div className="w-64 max-w-[80vw]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {pick("Cài đặt đọc", "Reader settings")}
      </p>

      <Toggle
        label={t("grammar.settings.hideAnswers")}
        checked={settings.hideAnswers}
        onChange={(next) => update({ hideAnswers: next })}
      />
      <Toggle
        label={t("grammar.settings.showExtend")}
        checked={settings.showExtend}
        onChange={(next) => update({ showExtend: next })}
      />

      <div className="mt-2 flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
        <span className="text-sm text-zinc-700 dark:text-zinc-200">{pick("Cỡ chữ", "Text size")}</span>

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
          <span
            data-testid="grammar-font-step"
            className="w-8 text-center text-xs text-zinc-500 dark:text-zinc-400"
          >
            {settings.font + 1}/{FONT_STEPS.length}
          </span>
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
    </div>
  );
}
