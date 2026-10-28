"use client";

// The frame every page of the section sits in: sticky top bar, the contents
// tree (sidebar from lg, drawer below it), and the reading column — which is
// what the A− / A+ setting resizes, so the answers, tables and notes all scale
// together while the chrome stays put.

import { useState } from "react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Toc } from "@/lib/ielts/types";
import ContentsDrawer from "./ContentsDrawer";
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
      <TopBar
        toc={toc}
        breadcrumb={breadcrumb}
        contentsOpen={drawerOpen}
        onOpenContents={() => setDrawerOpen(true)}
      />

      <div className="lg:flex lg:gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto pr-1">
            <ContentsTree toc={toc} activeSlug={activeSlug} />
          </div>
        </aside>

        <div className={cn("min-w-0 flex-1", FONT_STEPS[settings.font])}>{children}</div>
      </div>

      <ContentsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t("ielts.nav.contents")}
        closeLabel={t("ielts.nav.closeToc")}
      >
        <ContentsTree toc={toc} activeSlug={activeSlug} onNavigate={() => setDrawerOpen(false)} />
      </ContentsDrawer>
    </div>
  );
}
