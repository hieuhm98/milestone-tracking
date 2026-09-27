"use client";

// The contents tree, like the PDF's bookmarks: Part → group → section or card →
// question. Used twice: as the desktop sidebar and inside the mobile drawer.
//
// Groups collapse so the whole of Part 1 and Part 2 & 3 stay reachable without
// endless scrolling; the group and section you are reading start open, and the
// question matching the current hash is marked.

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Toc, TocSection } from "@/lib/ielts/types";
import { PART, type PartKey } from "./tokens";
import { anchorFor, byGroup, cardHref, part1Href } from "./navigation";

interface Props {
  toc: Toc;
  /** Slug of the section being read, if any. */
  activeSlug?: string;
  /** Closes the drawer after a jump. */
  onNavigate?: () => void;
}

function hrefFor(part: PartKey, slug: string): string {
  return part === "part1" ? part1Href(slug) : cardHref(slug);
}

function SectionBranch({
  section,
  part,
  active,
  activeAnchor,
  onNavigate,
}: {
  section: TocSection;
  part: PartKey;
  active: boolean;
  activeAnchor: string;
  onNavigate?: () => void;
}) {
  const base = hrefFor(part, section.slug);

  return (
    <li>
      <Link
        href={base}
        onClick={onNavigate}
        className={cn(
          "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
          active ? cn("font-semibold", PART[part].text) : "text-zinc-700 dark:text-zinc-300"
        )}
      >
        <span
          className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", active ? PART[part].dot : "bg-zinc-300 dark:bg-zinc-600")}
          aria-hidden="true"
        />
        <span>
          {section.label} — {section.title}
        </span>
      </Link>

      {active && (
        <ul className="ml-4 border-l border-zinc-200 pl-2 dark:border-zinc-800">
          {section.questions.map((question) => {
            const anchor = anchorFor(question.id);

            return (
              <li key={question.id}>
                <a
                  href={`${base}#${anchor}`}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded px-2 py-1 text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    activeAnchor === anchor
                      ? cn("font-semibold", PART[part].text)
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {question.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function PartBranch({
  heading,
  part,
  sections,
  activeSlug,
  activeAnchor,
  onNavigate,
}: {
  heading: string;
  part: PartKey;
  sections: TocSection[];
  activeSlug?: string;
  activeAnchor: string;
  onNavigate?: () => void;
}) {
  const activeGroup = sections.find((section) => section.slug === activeSlug)?.group;
  const [open, setOpen] = useState<string | null>(activeGroup ?? byGroup(sections)[0]?.group ?? null);

  return (
    <div>
      <p className={cn("px-2 pb-1 text-xs font-semibold uppercase tracking-wider", PART[part].text)}>{heading}</p>

      {byGroup(sections).map(({ group, sections: groupSections }) => (
        <div key={group}>
          <button
            type="button"
            onClick={() => setOpen(open === group ? null : group)}
            aria-expanded={open === group}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <span aria-hidden="true">{open === group ? "▾" : "▸"}</span>
            {group}
          </button>

          {open === group && (
            <ul className="mb-1">
              {groupSections.map((section) => (
                <SectionBranch
                  key={section.slug}
                  section={section}
                  part={part}
                  active={section.slug === activeSlug}
                  activeAnchor={activeAnchor}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ContentsTree({ toc, activeSlug, onNavigate }: Props) {
  const [activeAnchor, setActiveAnchor] = useState("");

  useEffect(() => {
    const sync = () => setActiveAnchor(window.location.hash.replace("#", ""));

    sync();
    window.addEventListener("hashchange", sync);

    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <nav aria-label="Contents" className="space-y-4">
      <PartBranch
        heading="Part 1"
        part="part1"
        sections={toc.part1}
        activeSlug={activeSlug}
        activeAnchor={activeAnchor}
        onNavigate={onNavigate}
      />

      <PartBranch
        heading="Part 2 & 3"
        part="part23"
        sections={toc.part23}
        activeSlug={activeSlug}
        activeAnchor={activeAnchor}
        onNavigate={onNavigate}
      />
    </nav>
  );
}
