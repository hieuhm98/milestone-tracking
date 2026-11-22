import { ArrowDownUp, Grid2x2, Type, type LucideIcon } from "lucide-react";
import type { GameId } from "@/lib/games/types";

export interface GameMeta {
  id: GameId;
  icon: LucideIcon;
  name: { vi: string; en: string };
  blurb: { vi: string; en: string };
}

export const GAMES: GameMeta[] = [
  {
    id: "wordle",
    icon: Type,
    name: { vi: "Đoán thuật ngữ", en: "Term Wordle" },
    blurb: {
      vi: "Đoán thuật ngữ bị che trong một câu của bài học. Từ càng dài, bạn càng có nhiều lượt.",
      en: "Guess the term blanked out of a sentence from the course. The longer the word, the more tries you get.",
    },
  },
  {
    id: "sort",
    icon: Grid2x2,
    name: { vi: "Phân loại chủ đề", en: "Topic Sort" },
    blurb: {
      vi: "16 thuật ngữ thuộc 4 chủ đề của khoá. Xếp mỗi nhóm 4 thuật ngữ về đúng chủ đề.",
      en: "16 terms from 4 topics of the course. Find the four terms that belong to each topic.",
    },
  },
  {
    id: "sequence",
    icon: ArrowDownUp,
    name: { vi: "Xếp thứ tự & ghép cặp", en: "Order & Match" },
    blurb: {
      vi: "Sắp các bước theo đúng trình tự, hoặc ghép mỗi khái niệm với định nghĩa của nó.",
      en: "Put steps in the right order, or match each concept with its definition.",
    },
  },
];

export const gameMeta = (id: GameId): GameMeta => GAMES.find((g) => g.id === id) ?? GAMES[0];
