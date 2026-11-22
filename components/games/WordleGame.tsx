"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { letterStates, scoreGuess, shareGrid, type Mark } from "@/lib/games/wordle";
import type { WordlePuzzle } from "@/lib/games/types";
import type { GameProps } from "./shared";

export interface WordleData {
  guesses: string[];
}

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const TILE: Record<Mark, string> = {
  hit: "bg-emerald-500 border-emerald-500 text-white",
  near: "bg-amber-500 border-amber-500 text-white",
  miss: "bg-zinc-500 border-zinc-500 text-white dark:bg-zinc-700 dark:border-zinc-700",
};

const KEY: Record<Mark, string> = {
  hit: "bg-emerald-500 text-white",
  near: "bg-amber-500 text-white",
  miss: "bg-zinc-400 text-white dark:bg-zinc-800 dark:text-zinc-500",
};

export default function WordleGame({ puzzle, initial, onChange }: GameProps<WordlePuzzle, WordleData>) {
  const { pick } = useLang();
  const { word, tries } = puzzle;
  const [guesses, setGuesses] = useState<string[]>(initial?.guesses ?? []);
  const [current, setCurrent] = useState("");
  const [notice, setNotice] = useState("");
  const lastRow = useRef<HTMLDivElement>(null);

  const won = guesses[guesses.length - 1] === word;
  const over = won || guesses.length >= tries;
  const states = useMemo(() => letterStates(guesses, word), [guesses, word]);

  const submit = useCallback(() => {
    if (over) return;

    if (current.length !== word.length) {
      setNotice(pick(`Cần đủ ${word.length} chữ cái`, `Needs ${word.length} letters`));

      return;
    }

    const next = [...guesses, current];
    const nowWon = current === word;
    const nowOver = nowWon || next.length >= tries;

    setGuesses(next);
    setCurrent("");
    setNotice("");
    onChange(
      { guesses: next },
      nowOver
        ? {
            status: nowWon ? "won" : "lost",
            score: next.length,
            share: [`${nowWon ? next.length : "X"}/${tries}`, shareGrid(next, word)].join("\n"),
          }
        : undefined
    );
  }, [over, current, word, guesses, tries, onChange, pick]);

  const type = useCallback(
    (letter: string) => {
      if (over) return;

      setNotice("");
      setCurrent((c) => (c.length < word.length ? c + letter : c));
    },
    [over, word.length]
  );

  const erase = useCallback(() => setCurrent((c) => c.slice(0, -1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;

      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (e.key === "Enter") {
        // A focused button would also fire a click on Enter.
        if (target?.tagName === "BUTTON") return;

        e.preventDefault();
        submit();
      } else if (e.key === "Backspace") {
        erase();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        type(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [submit, erase, type]);

  useEffect(() => {
    lastRow.current?.scrollIntoView({ block: "nearest" });
  }, [guesses.length]);

  const rows = Array.from({ length: tries }, (_, r) => {
    const guess = guesses[r];
    const active = !guess && r === guesses.length && !over;
    const letters = guess ?? (active ? current : "");

    return { guess, active, letters, marks: guess ? scoreGuess(guess, word) : null };
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {pick("Điền từ còn thiếu", "Fill in the missing term")} · {word.length} {pick("chữ cái", "letters")} ·{" "}
          {tries} {pick("lượt", "tries")}
        </p>
        <p className="text-base leading-relaxed" lang="en">
          {over ? puzzle.sentence : puzzle.clue}
        </p>
        <p className="text-xs text-zinc-500">
          {pick("Trích từ bài: ", "From the lesson: ")}
          {pick(puzzle.topic.vi, puzzle.topic.en)}
        </p>
      </div>

      <div
        role="group"
        aria-label={pick("Bảng đoán", "Guess board")}
        className="mx-auto space-y-1.5"
        style={{ maxWidth: `${word.length * 3.25}rem` }}
      >
        {rows.map((row, r) => (
          <div
            key={r}
            ref={r === Math.min(guesses.length, tries - 1) ? lastRow : undefined}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${word.length}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: word.length }, (_, c) => {
              const letter = row.letters[c] ?? "";
              const mark = row.marks?.[c];

              return (
                <div
                  key={c}
                  aria-label={
                    mark
                      ? `${letter}, ${mark === "hit" ? pick("đúng vị trí", "correct") : mark === "near" ? pick("sai vị trí", "wrong place") : pick("không có", "not in word")}`
                      : letter || pick("trống", "empty")
                  }
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-md border-2 text-lg sm:text-xl font-bold uppercase select-none",
                    mark
                      ? TILE[mark]
                      : letter
                        ? "border-zinc-500 dark:border-zinc-400"
                        : row.active
                          ? "border-zinc-300 dark:border-zinc-600"
                          : "border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="min-h-5 text-center text-sm text-amber-600 dark:text-amber-400" aria-live="polite">
        {notice}
      </p>

      {!over && (
        <div className="mx-auto max-w-lg space-y-1.5" aria-label={pick("Bàn phím", "Keyboard")}>
          {ROWS.map((letters, i) => (
            <div key={letters} className="flex justify-center gap-1">
              {i === 2 && (
                <button
                  type="button"
                  onClick={submit}
                  className="px-2.5 sm:px-4 h-11 rounded-md bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold"
                >
                  {pick("Gửi", "Enter")}
                </button>
              )}
              {Array.from(letters).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => type(l)}
                  className={cn(
                    "h-11 min-w-0 flex-1 max-w-10 rounded-md text-sm font-semibold",
                    states[l] ? KEY[states[l]] : "bg-zinc-200 dark:bg-zinc-700"
                  )}
                >
                  {l}
                </button>
              ))}
              {i === 2 && (
                <button
                  type="button"
                  onClick={erase}
                  aria-label={pick("Xoá", "Delete")}
                  className="px-2.5 sm:px-4 h-11 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center"
                >
                  <Delete className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
