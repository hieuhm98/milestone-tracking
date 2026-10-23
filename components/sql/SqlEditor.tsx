"use client";

import { forwardRef, type ReactNode } from "react";

/** The SQL textarea with its footer bar; Ctrl/⌘+Enter calls `onRun`. */
export const SqlEditor = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    onRun: () => void;
    placeholder?: string;
    rows?: number;
    pick: (vi: string, en: string) => string;
    /** Buttons for the right of the footer. */
    actions: ReactNode;
    label?: string;
  }
>(function SqlEditor({ value, onChange, onRun, placeholder, rows = 8, pick, actions, label }, ref) {
  return (
    // `!p-0`: `.card` is unlayered CSS, so a plain `p-0` utility loses to its padding.
    <div className="card !p-0 overflow-hidden">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onRun();
          }
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={rows}
        aria-label={label ?? pick("Câu lệnh SQL", "SQL statement")}
        className="w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-sm p-4 resize-y focus:outline-none border-b border-zinc-200 dark:border-zinc-800"
        placeholder={placeholder}
      />
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900">
        <span className="text-xs text-zinc-500 hidden sm:inline">
          {pick("Nhấn", "Press")}{" "}
          <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300">
            Ctrl+Enter
          </kbd>{" "}
          {pick("để chạy", "to run")}
        </span>
        <div className="flex items-center gap-2 ml-auto">{actions}</div>
      </div>
    </div>
  );
});
