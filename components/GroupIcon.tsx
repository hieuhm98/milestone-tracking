import {
  Binary,
  BookOpen,
  Cloud,
  Cpu,
  FileText,
  KanbanSquare,
  ListChecks,
  Network,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One SVG icon per course track. `lib/groups.ts` still carries a text glyph for
 * plain-string contexts, but font glyphs (◉ ⌬ ⛭) render differently — or not at
 * all — across operating systems, so every rendered icon goes through here.
 */
const GROUP_ICONS: Record<string, LucideIcon> = {
  "it-fundamentals": Cpu,
  ba: ListChecks,
  po: Target,
  pm: KanbanSquare,
  req: FileText,
  dev: Cloud,
  dsa: Binary,
  sa: Network,
};

export function groupIconFor(groupId: string | undefined): LucideIcon {
  return (groupId && GROUP_ICONS[groupId]) || BookOpen;
}

export default function GroupIcon({
  group,
  className,
}: {
  /** The group id, e.g. "ba". Unknown ids fall back to a book. */
  group: string | undefined;
  className?: string;
}) {
  const Icon = groupIconFor(group);

  return <Icon aria-hidden="true" className={cn("h-[1em] w-[1em] shrink-0", className)} />;
}
