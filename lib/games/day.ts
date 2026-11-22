// The puzzle day rolls over at midnight in Vietnam (the same clock the sandbox
// reset uses), not in the learner's own time zone, so everyone shares one puzzle.

const ZONE = "Asia/Ho_Chi_Minh";

export function puzzleDay(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The day before `day` (both YYYY-MM-DD). Pure calendar arithmetic, no zone. */
export function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));

  return date.toISOString().slice(0, 10);
}
