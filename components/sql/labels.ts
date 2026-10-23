import type { ChallengeDb, Difficulty } from "@/lib/sqlChallenges";

export const DIFFICULTY_LABEL: Record<Difficulty, { vi: string; en: string }> = {
  easy: { vi: "Dễ", en: "Easy" },
  medium: { vi: "Vừa", en: "Medium" },
  hard: { vi: "Khó", en: "Hard" },
};

export const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  hard: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
};

export const DB_LABEL: Record<ChallengeDb, { vi: string; en: string }> = {
  words: { vi: "Kho từ vựng", en: "Word bank" },
  fintech: { vi: "Fintech", en: "Fintech" },
};
