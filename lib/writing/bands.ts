import { lengthCap, roundBand, type EssayMetrics } from "./metrics";

/** Harper finds the obvious slips, not every error, so a clean run is capped at 8. */
export function grammarBandFromLints(errorsPer100: number): number {
  if (errorsPer100 <= 0.5) return 8;
  if (errorsPer100 <= 1.5) return 7;
  if (errorsPer100 <= 3) return 6;
  if (errorsPer100 <= 5) return 5;
  if (errorsPer100 <= 8) return 4;

  return 3;
}

/** Spelling slips plus word variety, used only when the AI judge is unavailable. */
export function lexicalBandFromSignals(spellingPer100: number, m: EssayMetrics): number {
  let band = 6;

  if (m.lexicalVariety >= 0.75) band += 0.5;
  if (m.longWordShare >= 0.2) band += 0.5;
  if (m.lexicalVariety < 0.55) band -= 1;
  if (m.overusedWords.length >= 3) band -= 0.5;
  if (spellingPer100 > 1) band -= 1;
  if (spellingPer100 > 3) band -= 1;

  return Math.min(8, Math.max(3, roundBand(band)));
}

export function combineGrammar(harperBand: number, aiBand: number | null): number {
  return aiBand === null ? harperBand : roundBand((harperBand + aiBand) / 2);
}

export function applyLengthCap(taskBand: number, words: number, minWords: number): number {
  return Math.min(taskBand, lengthCap(words, minWords));
}

export function overall(bands: number[]): number {
  return roundBand(bands.reduce((a, b) => a + b, 0) / bands.length);
}
