"use client";

// WRITING TOPICS — three prompts, a box to write in and the unit's checklist.
// Nothing here is graded: the checklist is the learner's own review, which is
// why it ticks rather than scores.

import { useState } from "react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { WritingTopic } from "@/lib/grammar/types";
import Rich from "./text";
import { type PartTokens } from "./tokens";

function wordCount(value: string): number {
  const trimmed = value.trim();

  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function Topic({ topic, index, tokens }: { topic: WritingTopic; index: number; tokens: PartTokens }) {
  const { pick } = useLang();
  const [value, setValue] = useState("");
  const [ticked, setTicked] = useState<number[]>([]);

  return (
    <li className="card space-y-3">
      <div className="flex gap-3">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            tokens.block
          )}
          aria-hidden="true"
        >
          {index + 1}
        </span>

        <div className="min-w-0">
          <p className="font-medium">
            <Rich text={topic.prompt} boldClassName={tokens.target} />
          </p>
          <p className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs", tokens.chip)}>{topic.length}</p>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={6}
        aria-label={pick("Bài viết của bạn", "Your answer")}
        className="input resize-y"
      />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {wordCount(value)} {pick("từ", "words")}
      </p>

      <ul className="space-y-1">
        {topic.checklist.map((line, lineIndex) => (
          <li key={lineIndex}>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={ticked.includes(lineIndex)}
                onChange={(event) =>
                  setTicked((prev) =>
                    event.target.checked ? [...prev, lineIndex] : prev.filter((i) => i !== lineIndex)
                  )
                }
                className="mt-1 h-4 w-4 shrink-0 accent-teal-600"
              />
              <span className={cn(ticked.includes(lineIndex) && "text-zinc-400 line-through dark:text-zinc-500")}>
                <Rich text={line} />
              </span>
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function WritingTopics({ topics, tokens }: { topics: WritingTopic[]; tokens: PartTokens }) {
  return (
    <ol className="space-y-4">
      {topics.map((topic, index) => (
        <Topic key={index} topic={topic} index={index} tokens={tokens} />
      ))}
    </ol>
  );
}
