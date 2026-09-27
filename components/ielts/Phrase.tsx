"use client";

// A highlighted "phrase to learn" inside a Band 9 answer.
//
// Hover (or tap) shows the Vietnamese meaning from its vocabulary row — source
// Vietnamese, so it is shown in both language modes. Clicking also jumps to that
// row and flashes it, which is how the PDF's highlight ↔ table link is meant to
// feel. The row is found by data attribute rather than id because the table is
// rendered twice (table on desktop, cards on mobile).

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PHRASE, VOCAB } from "./tokens";

interface Props {
  text: string;
  /** Vietnamese meaning of the matching vocabulary row, when there is one. */
  vietnamese?: string;
  /** `data-vocab` value of the target row, e.g. "p1-q18-v0". */
  target?: string;
}

function flash(target: string) {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(`[data-vocab="${target}"]`));

  if (rows.length === 0) return;

  const visible = rows.find((row) => row.offsetParent !== null) ?? rows[0];

  visible.scrollIntoView({ behavior: "smooth", block: "center" });

  for (const row of rows) {
    row.classList.add(...VOCAB.flash);

    window.setTimeout(() => row.classList.remove(...VOCAB.flash), 1600);
  }
}

export default function Phrase({ text, vietnamese, target }: Props) {
  const [open, setOpen] = useState(false);

  const onActivate = () => {
    setOpen(true);

    if (target) flash(target);
  };

  // A span with role="button", not a <button>: Chrome keeps a real button at
  // inline-block whatever `display` says, which adds a line-break opportunity
  // after the phrase and strands the punctuation that follows it. A span flows
  // with the sentence and can wrap across lines like any other words.
  return (
    <span className="relative inline">
      <span
        role="button"
        tabIndex={0}
        title={vietnamese}
        aria-describedby={vietnamese ? `${target}-meaning` : undefined}
        className={cn(PHRASE, "cursor-pointer")}
        onClick={onActivate}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          onActivate();
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {text}
      </span>

      {open && vietnamese && (
        <span
          id={`${target}-meaning`}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-1 w-max max-w-[min(15rem,70vw)] -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-normal leading-snug text-zinc-50 shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {vietnamese}
        </span>
      )}
    </span>
  );
}
