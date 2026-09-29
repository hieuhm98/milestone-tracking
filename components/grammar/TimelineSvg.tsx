// The small "Past ──×── Present ──→ Future" diagram the books put next to a
// tense. The picture never carries the meaning on its own: the `label` is both
// the image's accessible name and a line of text under it.

import { cn } from "@/lib/utils";
import type { Timeline } from "@/lib/grammar/types";
import { type PartTokens } from "./tokens";

interface Props {
  timeline: Timeline;
  tokens: PartTokens;
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 54;
const PAD = 22;
const AXIS = 26;

export default function TimelineSvg({ timeline, tokens, className }: Props) {
  const marks = timeline.marks.length > 0 ? timeline.marks : ["now" as const];
  const step = (WIDTH - PAD * 2) / marks.length;
  const at = (index: number) => PAD + step * (index + 0.5);

  return (
    <figure className={cn("max-w-sm", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${timeline.tense}. ${timeline.label}`}
      >
        <title>{`${timeline.tense}. ${timeline.label}`}</title>

        <line
          x1={4}
          y1={AXIS}
          x2={WIDTH - 4}
          y2={AXIS}
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth={1.5}
        />
        <polygon
          points={`${WIDTH - 4},${AXIS} ${WIDTH - 13},${AXIS - 4.5} ${WIDTH - 13},${AXIS + 4.5}`}
          className="fill-zinc-400 dark:fill-zinc-500"
        />
        <text x={2} y={HEIGHT - 4} className="fill-zinc-500 text-[9px] dark:fill-zinc-400">
          Past
        </text>
        <text x={WIDTH - 32} y={HEIGHT - 4} className="fill-zinc-500 text-[9px] dark:fill-zinc-400">
          Future
        </text>

        {marks.map((mark, index) => {
          const x = at(index);

          if (mark === "now") {
            return (
              <g key={index}>
                <line
                  x1={x}
                  y1={AXIS - 13}
                  x2={x}
                  y2={AXIS + 13}
                  className="stroke-zinc-700 dark:stroke-zinc-200"
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={AXIS - 17}
                  textAnchor="middle"
                  className="fill-zinc-700 text-[9px] font-semibold dark:fill-zinc-200"
                >
                  NOW
                </text>
              </g>
            );
          }

          if (mark === "span") {
            return (
              <rect
                key={index}
                x={x - step * 0.4}
                y={AXIS - 5}
                width={step * 0.8}
                height={10}
                rx={5}
                className={cn("opacity-80", tokens.fill)}
              />
            );
          }

          if (mark === "repeat") {
            return (
              <g key={index} className={tokens.fill}>
                <circle cx={x - 9} cy={AXIS} r={3.5} />
                <circle cx={x} cy={AXIS} r={3.5} />
                <circle cx={x + 9} cy={AXIS} r={3.5} />
              </g>
            );
          }

          return <circle key={index} cx={x} cy={AXIS} r={5} className={tokens.fill} />;
        })}
      </svg>

      <figcaption className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="font-semibold">{timeline.tense}:</span> {timeline.label}
      </figcaption>
    </figure>
  );
}
