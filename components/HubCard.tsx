import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A whole-card link into one tool or section. Used by every hub page (Home,
 * Practice, English) so they share one look: tinted icon tile, title, a short
 * description, an optional stat line and a chevron that nudges on hover.
 */
export default function HubCard({
  href,
  icon: Icon,
  tile,
  title,
  description,
  stat,
}: {
  href: string;
  icon: LucideIcon;
  /** Tile colours — pass literal Tailwind classes so the JIT sees them. */
  tile: string;
  title: string;
  description: string;
  stat?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tile)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        <span className="block text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 leading-snug">{description}</span>
        {stat && <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-2 tabular-nums">{stat}</span>}
      </span>
      <ChevronRight
        className="h-4 w-4 mt-1 shrink-0 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 group-hover:translate-x-0.5 transition"
        aria-hidden="true"
      />
    </Link>
  );
}
