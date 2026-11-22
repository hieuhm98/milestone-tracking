// Wordle rules: pure, so the grading is easy to check.

export type Mark = "hit" | "near" | "miss";

/** Standard two-pass grading, so a repeated letter is only marked as often as it occurs. */
export function scoreGuess(guess: string, word: string): Mark[] {
  const marks: Mark[] = Array.from(guess, () => "miss");
  const left = new Map<string, number>();

  for (let i = 0; i < word.length; i++) {
    if (guess[i] === word[i]) {
      marks[i] = "hit";
    } else {
      left.set(word[i], (left.get(word[i]) ?? 0) + 1);
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === "hit") continue;

    const remaining = left.get(guess[i]) ?? 0;

    if (remaining > 0) {
      marks[i] = "near";
      left.set(guess[i], remaining - 1);
    }
  }

  return marks;
}

const RANK: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };

/** Best mark seen for each letter, for colouring the on-screen keyboard. */
export function letterStates(guesses: string[], word: string): Record<string, Mark> {
  const states: Record<string, Mark> = {};

  for (const guess of guesses) {
    scoreGuess(guess, word).forEach((mark, i) => {
      const letter = guess[i];

      if (!states[letter] || RANK[mark] > RANK[states[letter]]) states[letter] = mark;
    });
  }

  return states;
}

const EMOJI: Record<Mark, string> = { hit: "🟩", near: "🟨", miss: "⬛" };

export function shareGrid(guesses: string[], word: string): string {
  return guesses.map((g) => scoreGuess(g, word).map((m) => EMOJI[m]).join("")).join("\n");
}
