"use client";

// The frame every page of the section sits in: sticky top bar, the contents
// tree (sidebar from lg, drawer below it), and the reading column — which is
// what the A− / A+ setting resizes, so the answers, tables and notes all scale
// together while the chrome stays put.

import { useState } from "react";
import { X } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Toc } from "@/lib/ielts/types";
import ContentsTree from "./ContentsTree";
import TopBar from "./TopBar";
import { FONT_STEPS, useReaderSettings } from "./settings";

interface Props {
  toc: Toc;
  breadcrumb?: string;
  activeSlug?: string;
  children: React.ReactNode;
}

export default function SpeakingShell({ toc, breadcrumb, activeSlug, children }: Props) {
  const { t } = useLang();
  const [settings] = useReaderSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <TopBar toc={toc} breadcrumb={breadcrumb} onOpenContents={() => setDrawerOpen(true)} />

      <div className="lg:flex lg:gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
            <ContentsTree toc={toc} activeSlug={activeSlug} />
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
              <p className="text-sm font-semibold">{t("ielts.nav.contents")}</p>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("ielts.nav.closeToc")}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ContentsTree toc={toc} activeSlug={activeSlug} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
