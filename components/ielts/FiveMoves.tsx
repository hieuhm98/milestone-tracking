"use client";

// "Five moves that lift a Part 1 answer…" / "…a Part 2 talk and Part 3 answers
// to Band 9" — five numbered cards, source English in both language modes. The
// Part 2 & 3 list also carries the source's pronunciation tip box.

import { cn } from "@/lib/utils";
import { CRITERION, PART, type PartKey } from "./tokens";

interface Props {
  id: string;
  part: PartKey;
  title: string;
  titleVi?: string;
  steps: { label: string; text: string }[];
  tip?: { label: string; text: string };
}

export default function FiveMoves({ id, part, title, titleVi, steps, tip }: Props) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      {titleVi && <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{titleVi}</p>}

      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li key={index} className="card">
            <div className="flex gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                  PART[part].dot
                )}
              >
                {index + 1}
              </span>

              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{step.label} </span>
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {tip && (
        <div className={cn("mt-3 rounded-xl border p-3", CRITERION.pronunciation.cell)}>
          <p className={cn("text-xs font-semibold uppercase tracking-wider", CRITERION.pronunciation.name)}>
            {tip.label}
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{tip.text}</p>
        </div>
      )}
    </section>
  );
}
