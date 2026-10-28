"use client";

// The sticky section bar: Contents · Part 1 · Part 2 & 3, the reader-settings
// popover, and the breadcrumb of what you are reading.
//
// It sticks below the app's own mobile bar (min-h-14 → top-14) and at the very
// top from lg up, where that bar is replaced by the desktop rail.

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { List, Settings2 } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Toc } from "@/lib/ielts/types";
import { IELTS_BASE, cardHref, part1Href } from "./navigation";
import { PART } from "./tokens";
import ReaderSettings from "./ReaderSettings";

interface Props {
  toc: Toc;
  /** "Part 1 › Topics 1–10 › Topic 1 — Computers / Tablets" */
  breadcrumb?: string;
  /** Whether the contents drawer is showing — mirrored on its button. */
  contentsOpen?: boolean;
  onOpenContents: () => void;
}

// py-2 below sm makes each link a ~32px-tall tap target; the desktop bar keeps its compact height.
const LINK = "rounded-md px-2 py-2 sm:py-1 text-xs font-medium transition-colors";

export default function TopBar({ toc, breadcrumb, contentsOpen = false, onOpenContents }: Props) {
  const { t } = useLang();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popover = useRef<HTMLDivElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const settingsId = useId();

  // A click anywhere else closes the popover — it covers the text underneath.
  // Escape closes it too and hands focus back to the button that opened it.
  useEffect(() => {
    if (!settingsOpen) return;

    const onDown = (event: MouseEvent) => {
      if (popover.current && !popover.current.contains(event.target as Node)) setSettingsOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setSettingsOpen(false);
      settingsButton.current?.focus();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  const firstPart1 = toc.part1[0]?.slug;
  const firstCard = toc.part23[0]?.slug;

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 supports-[backdrop-filter]:backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={onOpenContents}
          aria-label={t("ielts.nav.openToc")}
          aria-haspopup="dialog"
          aria-expanded={contentsOpen}
          className={cn(LINK, "flex items-center gap-1.5 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:hidden")}
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          {t("ielts.nav.contents")}
        </button>

        <Link
          href={`${IELTS_BASE}#contents`}
          className={cn(LINK, "hidden text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:inline-block")}
        >
          {t("ielts.nav.contents")}
        </Link>

        {firstPart1 && (
          <Link href={part1Href(firstPart1)} className={cn(LINK, PART.part1.text, "hover:bg-sky-100 dark:hover:bg-sky-900/40")}>
            Part 1
          </Link>
        )}

        {firstCard && (
          <Link href={cardHref(firstCard)} className={cn(LINK, PART.part23.text, "hover:bg-violet-100 dark:hover:bg-violet-900/40")}>
            Part 2 &amp; 3
          </Link>
        )}

        <div className="relative ml-auto" ref={popover}>
          <button
            ref={settingsButton}
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            aria-expanded={settingsOpen}
            aria-controls={settingsId}
            // The text label is hidden on phones, so the button needs a name of its own.
            aria-label={t("ielts.settings.title")}
            className={cn(LINK, "flex items-center gap-1.5 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800")}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("ielts.settings.title")}</span>
          </button>

          {settingsOpen && (
            <div
              id={settingsId}
              role="group"
              aria-label={t("ielts.settings.title")}
              className="absolute right-0 top-full z-30 mt-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              <ReaderSettings />
            </div>
          )}
        </div>
      </div>

      {breadcrumb && (
        <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400" title={breadcrumb}>
          {breadcrumb}
        </p>
      )}
    </div>
  );
}
