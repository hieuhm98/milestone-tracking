"use client";

// The Part 2 cue card, styled like a real card, and the 1-MINUTE NOTES as four
// rotating pastel sticky notes. Every string here is source English and stays
// English in both language modes.

import { cn } from "@/lib/utils";
import type { CueCard } from "@/lib/ielts/types";
import { NOTE_COLOURS, PART } from "./tokens";

export default function CueCardBox({ card }: { card: CueCard }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-4 shadow-sm dark:border-violet-800 dark:bg-violet-950/40 sm:p-5">
        <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", PART.part23.text)}>Cue card</p>

        <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{card.prompt}</p>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">You should say:</p>

        <ul className="mt-1 space-y-1">
          {card.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-2 text-zinc-800 dark:text-zinc-100">
              <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", PART.part23.dot)} aria-hidden="true" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {card.notes.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold uppercase tracking-wider">1-minute notes</span> (what to jot down)
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {card.notes.map((note, index) => (
              <div
                key={index}
                className={cn("rounded-xl border p-3", NOTE_COLOURS[index % NOTE_COLOURS.length])}
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{note.label}</p>
                <p className="mt-0.5 text-zinc-700 dark:text-zinc-200">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
