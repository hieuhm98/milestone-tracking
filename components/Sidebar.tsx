"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/context/lang";
import { useTheme } from "@/context/theme";
import { LANGS } from "@/lib/i18n";
import { SECTIONS, sectionForPath, type SectionId } from "@/lib/sections";
import { cn } from "@/lib/utils";
import AccountCard from "@/components/auth/AccountCard";
import { useSidebarCollapsed } from "@/lib/useSidebarCollapsed";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  /** i18n key for the heading above the links; omitted for the top group. */
  heading?: string;
  items: NavItem[];
}

/** Each half of the site brings its own nav — see `lib/sections.ts`. */
const SECTION_NAV: Record<SectionId, NavGroup[]> = {
  it: [
    { items: [{ href: "/dashboard", label: "nav.home", icon: "◈" }] },
    {
      heading: "nav.sectionKnowledge",
      items: [
        { href: "/learn", label: "nav.learn", icon: "◐" },
        { href: "/knowledge", label: "nav.knowledge", icon: "◉" },
        { href: "/knowledge-review", label: "nav.review", icon: "⟳" },
        { href: "/exam", label: "nav.exam", icon: "◎" },
        { href: "/progress", label: "nav.progress", icon: "◑" },
      ],
    },
    {
      heading: "nav.sectionPractice",
      items: [
        { href: "/practice/blitz", label: "nav.blitz", icon: "⚡" },
        { href: "/practice/questions", label: "nav.exercises", icon: "✐" },
        { href: "/practice/sql", label: "nav.sqlPractice", icon: "▤" },
      ],
    },
  ],
  english: [
    { items: [{ href: "/english", label: "nav.englishHome", icon: "◈" }] },
    {
      heading: "nav.sectionEnglish",
      items: [
        { href: "/english/dictionary", label: "nav.dictionary", icon: "▤" },
        { href: "/english/practice", label: "nav.englishPractice", icon: "Ⓐ" },
        { href: "/english/ielts-speaking", label: "ielts.entry", icon: "◍" },
        { href: "/english/grammar-for-writing", label: "grammar.entry", icon: "✎" },
      ],
    },
  ],
};

/**
 * The nav itself. Rendered twice — as the fixed desktop rail and inside the
 * mobile drawer — so the two can never drift apart.
 */
function SidebarNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  const { lang, setLang, dual, toggleDual, t } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();

  // Minimised, the rail keeps one-click navigation but drops every label; the
  // icon carries the meaning and `title` gives it back on hover.
  if (collapsed) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center">
        <div className="py-4 text-lg font-bold" title="Milestone Tracking" aria-hidden="true">
          M
        </div>

        <div className="flex flex-col gap-1 pb-2">
          {SECTIONS.map((item) => (
            <Link
              key={item.id}
              href={item.home}
              title={t(item.label)}
              aria-label={t(item.label)}
              aria-current={section === item.id ? "true" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors",
                section === item.id
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
            </Link>
          ))}
        </div>

        <nav className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-1 pb-3">
          {SECTION_NAV[section].flatMap((group) => group.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={t(item.label)}
              aria-label={t(item.label)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors",
                pathname === item.href
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
            </Link>
          ))}
        </nav>

        {/* Language and theme still have to be reachable when minimised. */}
        <div className="shrink-0 flex flex-col items-center gap-1 pb-2">
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            title={t("lang.dual")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
        </div>

        <div className="shrink-0 pb-3">
          <AccountCard collapsed />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 lg:py-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="font-bold text-lg tracking-tight">Milestone Tracking</div>
        <div className="text-xs text-zinc-500 mt-0.5">IT · AWS · English</div>
      </div>

      {/* Which half of the site the nav below belongs to. */}
      <div className="px-3 pt-3">
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          {SECTIONS.map((item) => (
            <Link
              key={item.id}
              href={item.home}
              onClick={onNavigate}
              aria-current={section === item.id ? "true" : undefined}
              className={cn(
                "flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors",
                section === item.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
              {t(item.label)}
            </Link>
          ))}
        </div>
      </div>

      {/* Language toggle */}
      <div className="px-3 pt-3">
        <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                lang === l.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {l.short}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-side bilingual reading */}
      <div className="px-3 pt-2">
        <button
          onClick={toggleDual}
          aria-pressed={dual}
          title={t("lang.dualHint")}
          className={cn(
            "w-full flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-lg border transition-colors",
            dual
              ? "bg-blue-100 dark:bg-blue-600/20 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          )}
        >
          <span className="text-sm">⇹</span>
          {t("lang.dual")}
        </button>
      </div>

      {/* Theme toggle */}
      <div className="px-3 pt-2">
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <span className="text-sm">{theme === "dark" ? "☀" : "☾"}</span>
          {theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {SECTION_NAV[section].map((group) => (
          <div key={group.heading ?? "top"} className="space-y-1">
            {group.heading && (
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
                {t(group.heading)}
              </div>
            )}
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === item.href
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {t(item.label)}
              </Link>
            ))}
          </div>
        ))}

        {/* Daily Quick Test — prominent shortcut, IT only. */}
        {section === "it" && (
          <Link
            href="/knowledge-review?quick=1"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-600/25 transition-colors"
          >
            <span className="text-base">⚡</span>
            {t("nav.quickTest")}
          </Link>
        )}
      </nav>

      {/* Pinned under the scrolling nav so the sign-up nudge is always in view. */}
      <div className="shrink-0">
        <AccountCard />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  // A tap that navigates should also dismiss the drawer.
  useEffect(() => setOpen(false), [pathname]);

  // While the drawer is over the page, the page behind it must not scroll.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* Mobile bar. Sticky rather than fixed so it never covers page content. */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 min-h-14 px-4 pt-[env(safe-area-inset-top)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/90 supports-[backdrop-filter]:backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("nav.openMenu")}
          aria-expanded={open}
          aria-controls="app-nav"
          className="-ml-2 p-2 rounded-lg text-xl leading-none text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          ☰
        </button>
        <span className="font-bold tracking-tight truncate">Milestone Tracking</span>
      </header>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Off-canvas drawer. Kept mounted so it can animate, and inert when shut. */}
      <aside
        id="app-nav"
        aria-hidden={!open}
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-zinc-50 dark:bg-zinc-950",
          "border-r border-zinc-200 dark:border-zinc-800 shadow-xl",
          // `invisible` (not just off-screen) is what keeps the closed drawer's
          // links out of the tab order; transitioning visibility defers it to
          // the end of the slide so the animation still plays on close.
          "transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <div className="h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </aside>

      {/* Desktop rail. It minimises to icons rather than disappearing, so
          navigation stays one click away on a small laptop screen where the
          reading column is what needs the room. */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 border-r border-zinc-200 dark:border-zinc-800 h-screen sticky top-0",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            aria-expanded={!collapsed}
            className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm transition-colors"
          >
            <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
          </button>
          <SidebarNav collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}
