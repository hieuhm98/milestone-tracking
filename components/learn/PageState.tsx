"use client";

// Shared loading / error placeholders for the learning pages (courses, topics,
// knowledge, exams, progress). One look everywhere, and a fetch that fails
// always ends in a message with a retry instead of a blank page.

import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";

/** A spinner line that also reserves some height, so the footer area doesn't jump. */
export function PageLoading({ className }: { className?: string }) {
  const { t } = useLang();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex min-h-[40vh] items-start gap-2 py-2 text-sm text-zinc-500", className)}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {t("common.loading")}
    </div>
  );
}

/** "Could not load" with a retry button. */
export function PageError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const { t } = useLang();

  return (
    <div
      role="alert"
      className={cn(
        "max-w-md rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-red-800 dark:text-red-200">{t("common.loadError")}</p>
          <button type="button" onClick={onRetry} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t("common.retry")}
          </button>
        </div>
      </div>
    </div>
  );
}
