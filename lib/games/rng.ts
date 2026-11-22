// Seeded randomness for the daily puzzles. Every learner gets the same puzzle on
// the same day, so nothing here may touch Math.random().

/** FNV-1a — turns any string into a 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 2166136261;

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

/** mulberry32 — small, fast, good enough for picking a word. */
export function seededRandom(seed: string | number): () => number {
  let a = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;

    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

export function pickOne<T>(items: readonly T[], rand: () => number): T | undefined {
  return items.length ? items[Math.floor(rand() * items.length)] : undefined;
}
