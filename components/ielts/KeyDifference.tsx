"use client";

// The "Key difference" callout, plus the grey note box for the `Note: …`
// sentence a few cards carry (source text, split out of the same field).

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { KEY_DIFFERENCE } from "./tokens";

interface Props {
  text: string;
  note?: string;
}

export default function KeyDifference({ text, note }: Props) {
  return (
    <div>
      {note && (
        <p className="mb-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {note}
        </p>
      )}

      <div className={cn("flex gap-3 rounded-xl p-3 sm:p-4", KEY_DIFFERENCE.frame)}>
        <Lightbulb className={cn("mt-0.5 h-5 w-5 shrink-0", KEY_DIFFERENCE.label)} aria-hidden="true" />

        <p className="text-zinc-800 dark:text-zinc-100">
          <span className={cn("font-semibold", KEY_DIFFERENCE.label)}>Key difference: </span>
          {text}
        </p>
      </div>
    </div>
  );
}
