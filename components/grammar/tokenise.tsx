// Splits an authored paragraph into tappable pieces for the two tap-based
// tasks: "Grammar in Context" (tap every verb) and "Editing Practice" (tap each
// mistake). A target can be more than one word — "is preparing", "am student" —
// so the targets are matched first and whatever is left is cut into words.

export interface Piece {
  /** The exact text of this piece. */
  text: string;
  /** Position among the target occurrences, or -1 for an ordinary word. */
  hit: number;
  /** Whitespace and punctuation: never tappable. */
  gap: boolean;
}

const SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escape(value: string): string {
  return value.replace(SPECIAL, (match) => `\\${match}`);
}

/** Word-ish runs stay whole; spaces and punctuation become gaps. */
const WORD = /([^\s.,;:!?()"“”]+)/;
const GAP = /^[\s.,;:!?()"“”]+$/;

function words(text: string): Piece[] {
  return text
    .split(WORD)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, hit: -1, gap: GAP.test(part) }));
}

export function tokenise(text: string, targets: string[]): Piece[] {
  const unique = Array.from(new Set(targets.filter((target) => target.trim().length > 0)));

  if (unique.length === 0) return words(text);

  // Longest first, so "has been collecting" wins over "collecting".
  const alternatives = unique
    .sort((a, b) => b.length - a.length)
    .map((target) => {
      const head = /^\w/.test(target) ? "\\b" : "";
      const tail = /\w$/.test(target) ? "\\b" : "";

      return `${head}${escape(target)}${tail}`;
    })
    .join("|");

  const pattern = new RegExp(`(${alternatives})`, "g");
  const pieces: Piece[] = [];
  let cursor = 0;
  let hit = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) pieces.push(...words(text.slice(cursor, match.index)));

    pieces.push({ text: match[0], hit, gap: false });
    hit += 1;
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) pieces.push(...words(text.slice(cursor)));

  return pieces;
}

/** How many target occurrences the paragraph actually contains. */
export function countHits(text: string, targets: string[]): number {
  return tokenise(text, targets).filter((piece) => piece.hit >= 0).length;
}
