// What counts towards a score, and how many items a unit or a Part review
// holds. Kept out of the client components so the home page can work the
// totals out on the server while it reads the unit files.

import type {
  ChoiceItem,
  CombineItem,
  FixItem,
  FormItem,
  PartReview,
  SelfCheckItem,
  Unit,
} from "@/lib/grammar/types";
import { countHits } from "./tokenise";

export function isChoice(item: SelfCheckItem): item is ChoiceItem {
  return "options" in item;
}

export function isForm(item: SelfCheckItem): item is FormItem {
  return "base" in item;
}

export function isFix(item: SelfCheckItem): item is FixItem {
  return "error" in item;
}

export function isCombine(item: SelfCheckItem): item is CombineItem {
  return "sentences" in item;
}

/** Sentence combining is compared with a model, never auto-graded. */
export function isGraded(item: SelfCheckItem): boolean {
  return !isCombine(item);
}

/** Pretest + context targets + self-check items + editing errors. */
export function gradableTotal(unit: Unit): number {
  const selfChecks = unit.sections.reduce(
    (count, section) => count + (section.selfCheck?.items.filter(isGraded).length ?? 0),
    0
  );

  return (
    unit.pretest.length +
    countHits(unit.context.paragraph, unit.context.targets) +
    selfChecks +
    countHits(unit.editing.text, unit.editing.errors.map((error) => error.span))
  );
}

/** The mixed items plus every error in the review's long editing paragraph. */
export function reviewTotal(review: PartReview): number {
  return (
    review.items.length + countHits(review.editing.text, review.editing.errors.map((error) => error.span))
  );
}
