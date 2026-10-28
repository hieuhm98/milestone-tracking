"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  BookA,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Columns2,
  Database,
  Dumbbell,
  GraduationCap,
  House,
  Languages,
  Laptop,
  Menu,
  Mic,
  Moon,
  PenLine,
  PenTool,
  RotateCcw,
  ShoppingCart,
  Sun,
  Timer,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/context/lang";
import { useTheme } from "@/context/theme";
import { LANGS } from "@/lib/i18n";
import { SECTIONS, sectionForPath, type SectionId } from "@/lib/sections";
import { cn } from "@/lib/utils";
import AccountCard from "@/components/auth/AccountCard";
import { useAuth } from "@/context/auth";
import { useSidebarCollapsed } from "@/lib/useSidebarCollapsed";

const APP_NAME = "Milestone Tracking";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only highlight on this exact URL — used for section home pages. */
  exact?: boolean;
}

interface NavGroup {
  /** i18n key for the heading above the links; omitted for the top group. */
  heading?: string;
  items: NavItem[];
}

const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  it: Laptop,
  english: Languages,
};

/** Each half of the site brings its own nav — see `lib/sections.ts`. */
const SECTION_NAV: Record<SectionId, NavGroup[]> = {
  it: [
    { items: [{ href: "/dashboard", label: "nav.home", icon: House, exact: true }] },
    {
      heading: "nav.sectionKnowledge",
      items: [
        { href: "/learn", label: "nav.learn", icon: GraduationCap },
        { href: "/knowledge", label: "nav.knowledge", icon: BookOpen },
        { href: "/knowledge-review", label: "nav.review", icon: RotateCcw },
        { href: "/exam", label: "nav.exam", icon: ClipboardCheck },
        { href: "/progress", label: "nav.progress", icon: BarChart3 },
      ],
    },
    {
      heading: "nav.sectionPractice",
      items: [
        { href: "/practice/blitz", label: "nav.blitz", icon: Timer },
        { href: "/practice/questions", label: "nav.exercises", icon: PenTool },
        { href: "/practice/sql", label: "nav.sqlPractice", icon: Database },
        { href: "/practice/sql/challenges", label: "nav.sqlChallenges", icon: Trophy },
        { href: "/practice/api", label: "nav.apiPractice", icon: ArrowLeftRight },
        { href: "/practice/api/web", label: "nav.apiStore", icon: ShoppingCart },
      ],
    },
  ],
  english: [
    { items: [{ href: "/english", label: "nav.englishHome", icon: House, exact: true }] },
    {
      heading: "nav.sectionEnglish",
      items: [
        { href: "/english/dictionary", label: "nav.dictionary", icon: BookA },
        { href: "/english/practice", label: "nav.englishPractice", icon: Dumbbell },
        { href: "/english/ielts-speaking", label: "ielts.entry", icon: Mic },
        { href: "/english/grammar-for-writing", label: "grammar.entry", icon: PenLine },
      ],
    },
  ],
};

/** Shown under either half's nav, to admins only. */
const ADMIN_NAV: NavGroup = {
  heading: "nav.sectionAdmin",
  items: [{ href: "/admin/users", label: "nav.adminUsers", icon: Users }],
};

function navGroups(section: SectionId, isAdmin: boolean): NavGroup[] {
  return isAdmin ? [...SECTION_NAV[section], ADMIN_NAV] : SECTION_NAV[section];
}

function matches(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;

  return !item.exact && pathname.startsWith(item.href + "/");
}

/**
 * The link for the current page. A link stays highlighted on every page
 * beneath it (a course, a lesson, a topic), but when two links both match —
 * SQL Practice and SQL Challenges under it — the more specific one wins.
 */
function activeItem(pathname: string, groups: NavGroup[]): NavItem | undefined {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => matches(item, pathname))
    .sort((x, y) => y.href.length - x.href.length)[0];
}

/**
 * The nav itself. Rendered twice — as the fixed desktop rail and inside the
 * mobile drawer — so the two can never drift apart.
 */
function SidebarNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  const { lang, setLang, dual, toggleDual, t } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const { profile } = useAuth();
  const groups = navGroups(section, profile?.role === "admin");
  const current = activeItem(pathname, groups);
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  // Minimised, the rail keeps one-click navigation but drops every label; the
  // icon carries the meaning and `title` gives it back on hover.
  if (collapsed) {
    const iconLink =
      "flex h-9 w-9 items-center justify-center rounded-lg transition-colors";

    return (
      <div className="flex flex-col h-full items-center overflow-y-auto overscroll-contain">
        <div
          className="mt-4 mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
          title={APP_NAME}
          aria-hidden="true"
        >
          M
        </div>

        <div className="flex flex-col gap-1 pb-3 mb-2 border-b border-zinc-200 dark:border-zinc-800" role="group" aria-label={t("nav.siteSection")}>
          {SECTIONS.map((item) => {
            const Icon = SECTION_ICONS[item.id];

            return (
              <Link
                key={item.id}
                href={item.home}
                title={t(item.label)}
                aria-label={t(item.label)}
                aria-current={section === item.id ? "true" : undefined}
                className={cn(
                  iconLink,
                  section === item.id
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
            );
          })}
        </div>

        <nav aria-label={t("nav.mainNav")} className="w-full flex flex-col items-center gap-1 pb-3">
          {groups.map((group, index) => (
            <div
              key={group.heading ?? "top"}
              className={cn("flex flex-col items-center gap-1", index > 0 && "pt-1.5 mt-0.5 border-t border-zinc-200 dark:border-zinc-800 w-9")}
            >
              {group.items.map((item) => {
                const active = item === current;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={t(item.label)}
                    aria-label={t(item.label)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      iconLink,
                      active
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ))}

          {section === "it" && (
            <Link
              href="/knowledge-review?quick=1"
              onClick={onNavigate}
              title={t("nav.quickTest")}
              aria-label={t("nav.quickTest")}
              className={cn(iconLink, "mt-1.5 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/25")}
            >
              <Zap className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          )}
        </nav>

        {/* Language, side-by-side mode and theme stay reachable when minimised. */}
        <div className="mt-auto shrink-0 flex flex-col items-center gap-1 py-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            title={`${t("nav.language")}: ${lang.toUpperCase()}`}
            aria-label={`${t("nav.language")}: ${lang.toUpperCase()}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={toggleDual}
            aria-pressed={dual}
            title={t("lang.dualHint")}
            aria-label={t("lang.dual")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              dual
                ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}
          >
            <Columns2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <ThemeIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="shrink-0 pb-3">
          <AccountCard collapsed />
        </div>
      </div>
    );
  }

  return (
    // The whole column scrolls as one when it is taller than the screen —
    // no separately scrolling middle section.
    <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
      <div className="px-5 py-4 lg:py-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="font-bold text-lg tracking-tight">{APP_NAME}</div>
        <div className="text-xs text-zinc-500 mt-0.5">IT · AWS · English</div>
      </div>

      {/* Which half of the site the nav below belongs to. */}
      <div className="px-3 pt-3">
        <div
          className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          role="group"
          aria-label={t("nav.siteSection")}
        >
          {SECTIONS.map((item) => {
            const Icon = SECTION_ICONS[item.id];

            return (
              <Link
                key={item.id}
                href={item.home}
                onClick={onNavigate}
                aria-current={section === item.id ? "true" : undefined}
                className={cn(
                  "flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors",
                  section === item.id
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Language toggle */}
      <div className="px-3 pt-3">
        <div
          className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          role="group"
          aria-label={t("nav.language")}
        >
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              title={l.label}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 rounded-md transition-colors",
                lang === l.id
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
          type="button"
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
          <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t("lang.dual")}
        </button>
      </div>

      {/* Theme toggle */}
      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2 text-xs font-medium py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {themeLabel}
        </button>
      </div>

      <nav aria-label={t("nav.mainNav")} className="px-3 py-4 space-y-1">
        {groups.map((group) => (
          <div key={group.heading ?? "top"} className="space-y-1">
            {group.heading && (
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t(group.heading)}
              </div>
            )}
            {group.items.map((item) => {
              const active = item === current;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t(item.label)}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Daily Quick Test — prominent shortcut, IT only. */}
        {section === "it" && (
          <Link
            href="/knowledge-review?quick=1"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-600/25 transition-colors"
          >
            <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("nav.quickTest")}
          </Link>
        )}
      </nav>

      {/* Sits at the bottom on a tall screen, after the links on a short one. */}
      <div className="mt-auto">
        <AccountCard />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // A tap that navigates should also dismiss the drawer.
  useEffect(() => setOpen(false), [pathname]);

  // Name the browser tab after the page, so tabs and history are tellable apart.
  useEffect(() => {
    const item = activeItem(pathname, navGroups(sectionForPath(pathname), isAdmin));

    document.title = item ? `${t(item.label)} · ${APP_NAME}` : APP_NAME;
  }, [pathname, t, isAdmin]);

  // Opening moves focus into the drawer; closing hands it back to the menu button.
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    } else if (wasOpen.current) {
      menuButtonRef.current?.focus();
    }

    wasOpen.current = open;
  }, [open]);

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

  const current = activeItem(pathname, navGroups(sectionForPath(pathname), isAdmin));

  return (
    <>
      {/* Mobile bar. Sticky rather than fixed so it never covers page content. */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-2 min-h-14 px-2 pt-[env(safe-area-inset-top)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/90 supports-[backdrop-filter]:backdrop-blur">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("nav.openMenu")}
          aria-expanded={open}
          aria-controls="app-nav"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 leading-tight">
          <div className="font-bold tracking-tight truncate">{current ? t(current.label) : APP_NAME}</div>
          {current && <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{APP_NAME}</div>}
        </div>
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
        aria-label={t("nav.mainNav")}
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-zinc-50 dark:bg-zinc-950",
          "border-r border-zinc-200 dark:border-zinc-800 shadow-xl",
          // `invisible` (not just off-screen) is what keeps the closed drawer's
          // links out of the tab order; transitioning visibility defers it to
          // the end of the slide so the animation still plays on close.
          "transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <div className="relative h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
            className="absolute right-2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </aside>

      {/* Desktop rail. It minimises to icons rather than disappearing, so
          navigation stays one click away on a small laptop screen where the
          reading column is what needs the room. */}
      <aside
        aria-label={t("nav.mainNav")}
        className={cn(
          "hidden lg:block shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 h-screen sticky top-0",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            aria-expanded={!collapsed}
            className="absolute -right-3.5 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm transition-colors"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <SidebarNav collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}
