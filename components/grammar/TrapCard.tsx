// VIETNAMESE LEARNER TRAPS — the ✗ / ✓ pair with the reason behind it.
//
// The card is a server component: everything on it is learning content, which
// stays English in both language modes. The one Vietnamese string is `viCue`,
// the wording that causes the error, and it shows in both modes by design.

import { cn } from "@/lib/utils";
import type { Trap } from "@/lib/grammar/types";
import Rich from "./text";
import { TRAP } from "./tokens";
import { trapAnchor } from "./navigation";

export default function TrapCard({ trap, units }: { trap: Trap; units?: string }) {
  return (
    <article
      id={trapAnchor(trap.id)}
      className={cn("scroll-mt-28 space-y-2 rounded-xl p-4", TRAP.frame)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-md px-2 py-0.5 font-mono text-xs font-semibold", TRAP.id)}>{trap.id}</span>

        <h3 className="min-w-0 flex-1 basis-40 font-semibold">
          <Rich text={trap.title} />
        </h3>

        {units && <span className="text-xs text-zinc-500 dark:text-zinc-400">{units}</span>}
      </div>

      <p className={cn("rounded-r-lg px-3 py-1.5 text-sm", TRAP.wrong)}>
        <span className="mr-1.5 font-bold" aria-hidden="true">
          ✗
        </span>
        <span className="sr-only">Wrong: </span>
        <Rich text={trap.wrong} boldClassName="font-bold" />
      </p>

      <p className={cn("rounded-r-lg px-3 py-1.5 text-sm", TRAP.right)}>
        <span className="mr-1.5 font-bold" aria-hidden="true">
          ✓
        </span>
        <span className="sr-only">Right: </span>
        <Rich text={trap.right} boldClassName="font-bold" />
      </p>

      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        <Rich text={trap.why} />
      </p>

      {trap.viCue && trap.viCue !== "—" && (
        <p className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs", TRAP.cue)}>
          <span className="mr-1" aria-hidden="true">
            🇻🇳
          </span>
          <Rich text={trap.viCue} />
        </p>
      )}
    </article>
  );
}
