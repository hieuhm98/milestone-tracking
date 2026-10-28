"use client";

import { cn } from "@/lib/utils";

/**
 * The side-by-side primitive: English on the left, Vietnamese on the right,
 * stacking on narrow screens where two columns would be unreadable.
 *
 * Every side-by-side surface in the app goes through this so the column order,
 * gutter and language labels stay identical whether you're reading an article
 * section, a question stem, or one answer option.
 */
export default function BilingualPair({
  en,
  vi,
  className,
  labels = false,
  divider = true,
}: {
  en: React.ReactNode;
  vi: React.ReactNode;
  className?: string;
  /** Show small EN / VI captions above each column. */
  labels?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-y-3",
        // With a divider the gutter comes from each column's padding, so the rule
        // sits centred between the two languages instead of hugging the right one.
        divider
          ? "md:divide-x md:divide-zinc-200 md:dark:divide-zinc-800"
          : "md:gap-x-6",
        className
      )}
    >
      <div className={cn("min-w-0", divider && "md:pr-6")}>
        {labels && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            EN
          </div>
        )}
        {en}
      </div>
      <div className={cn("min-w-0", divider && "md:pl-6")}>
        {labels && (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            VI
          </div>
        )}
        {vi}
      </div>
    </div>
  );
}
