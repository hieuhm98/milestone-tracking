"use client";

// The frame every page of the section sits in: sticky top bar, the contents
// tree (sidebar from lg, drawer below it), and the reading column — which is
// what the A− / A+ setting resizes, so the tables, rules and exercises all
// scale together while the chrome stays put.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { List, Settings2, X } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { PartId, Syllabus } from "@/lib/grammar/types";
import ContentsTree, { type OutlineEntry } from "./ContentsTree";
import ReaderSettings from "./ReaderSettings";
import { FONT_STEPS, useGrammarSettings } from "./settings";
import { GRAMMAR_BASE, trapsHref, unitHref } from "./navigation";
import { PART } from "./tokens";

interface Props {
  syllabus: Syllabus;
  reviewParts: PartId[];
  referenceSlugs: string[];
  breadcrumb?: string;
  activeUnitId?: string;
  outline?: OutlineEntry[];
  children: React.ReactNode;
}

const LINK = "rounded-md px-2 py-1 text-xs font-medium transition-colors";

export default function GrammarShell({
  syllabus,
  reviewParts,
  referenceSlugs,
  breadcrumb,
  activeUnitId,
  outline,
  children,
}: Props) {
  const { t, pick } = useLang();
  const [settings] = useGrammarSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popover = useRef<HTMLDivElement>(null);

  // A click anywhere else closes the popover — it covers the text underneath.
  useEffect(() => {
    if (!settingsOpen) return;

    const onDown = (event: MouseEvent) => {
      if (popover.current && !popover.current.contains(event.target as Node)) setSettingsOpen(false);
    };

    document.addEventListener("mousedown", onDown);

    return () => document.removeEventListener("mousedown", onDown);
  }, [settingsOpen]);

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-2 supports-[backdrop-filter]:backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              LINK,
              "flex items-center gap-1.5 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:hidden"
            )}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            {t("grammar.nav.contents")}
          </button>

          <Link
            href={GRAMMAR_BASE}
            className={cn(
              LINK,
              "hidden text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:inline-block"
            )}
          >
            {t("grammar.nav.contents")}
          </Link>

          {syllabus.parts.map((part) => {
            const first = part.units[0];

            if (!first) return null;

            return (
              <Link
                key={part.id}
                href={unitHref(first.id)}
                className={cn(LINK, PART[part.id].text, "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
              >
                Part {part.id}
              </Link>
            );
          })}

          <Link
            href={trapsHref()}
            className={cn(
              LINK,
              "text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
            )}
          >
            Traps
          </Link>

          <div className="relative ml-auto" ref={popover}>
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-expanded={settingsOpen}
              data-testid="grammar-settings-button"
              className={cn(
                LINK,
                "flex items-center gap-1.5 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{pick("Cài đặt", "Settings")}</span>
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
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

      <div className="lg:flex lg:gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
            <ContentsTree
              syllabus={syllabus}
              reviewParts={reviewParts}
              referenceSlugs={referenceSlugs}
              activeUnitId={activeUnitId}
              outline={outline}
            />
          </div>
        </aside>

        <div className={cn("min-w-0 flex-1", FONT_STEPS[settings.font])}>{children}</div>
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("grammar.nav.contents")}</p>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ContentsTree
              syllabus={syllabus}
              reviewParts={reviewParts}
              referenceSlugs={referenceSlugs}
              activeUnitId={activeUnitId}
              outline={outline}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
