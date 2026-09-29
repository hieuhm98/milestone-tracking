// The small repeated furniture of a unit: the caps block headings the books
// use, WRITING TIP boxes, NOTE callouts, and a Using rule with its examples.

import { cn } from "@/lib/utils";
import type { Rule } from "@/lib/grammar/types";
import Rich from "./text";
import { BLOCK_HEADING, NOTE, TIP, type PartTokens } from "./tokens";

/**
 * "GRAMMAR FOCUS", "PRETEST", … — English in both language modes (content
 * spec §4), so the label is passed in as written.
 */
export function BlockHeading({
  id,
  label,
  tokens,
  instruction,
  children,
}: {
  id?: string;
  label: string;
  tokens: PartTokens;
  /** The interface sentence under the heading, which does switch language. */
  instruction?: string;
  children?: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-28">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("h-3 w-1.5 rounded-full", tokens.bar)} aria-hidden="true" />
        <h2 className={cn(BLOCK_HEADING, tokens.text)}>{label}</h2>
        {children}
      </div>

      {instruction && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{instruction}</p>}
    </div>
  );
}

export function WritingTip({ text }: { text: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl", TIP.frame)}>
      <p className={cn("px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]", TIP.stripe)}>Writing Tip</p>

      <p className={cn("px-3 py-2 text-sm", TIP.text)}>
        <Rich text={text} />
      </p>
    </div>
  );
}

export function NoteCallout({ text }: { text: string }) {
  return (
    <p className={cn("rounded-r-lg px-3 py-2 text-sm", NOTE)}>
      <span className="font-bold uppercase tracking-wide">Note:</span> <Rich text={text} />
    </p>
  );
}

export function RuleList({ rules, tokens }: { rules: Rule[]; tokens: PartTokens }) {
  return (
    <ol className="space-y-3">
      {rules.map((rule, index) => (
        <li key={index} className="flex gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              tokens.block
            )}
            aria-hidden="true"
          >
            {index + 1}
          </span>

          <div className="min-w-0">
            <p className="font-medium">
              <Rich text={rule.text} />
            </p>

            <ul className="mt-1 space-y-0.5">
              {rule.examples.map((example, exampleIndex) => (
                <li key={exampleIndex} className="text-sm italic text-zinc-700 dark:text-zinc-300">
                  <span className={cn("mr-1.5 not-italic", tokens.text)} aria-hidden="true">
                    ▸
                  </span>
                  <Rich text={example.text} boldClassName={cn("not-italic", tokens.target)} />
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}
