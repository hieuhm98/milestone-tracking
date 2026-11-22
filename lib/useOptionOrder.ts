"use client";

import { useCallback, useRef } from "react";

/** A uniformly random permutation of 0…n-1 (Fisher–Yates). */
export function shuffledIndices(n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);

  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/**
 * Display order for answer options, one random permutation per question.
 *
 * Returns `orderFor(key, n)`: the content indices of a question's options in the
 * order to show them. The first call for a key draws a fresh shuffle; later calls
 * return the same one for as long as the component stays mounted, so options never
 * move under a half-finished answer. Remounting (a new session, a retry) deals new
 * orders, so meeting a question again is not a matter of remembering a position.
 *
 * Only the rendering is permuted. Choices, grading, saved answers and
 * `optionExplanations` all stay in content indices — map with `order[displayPos]`.
 */
export function useOptionOrder(): (key: string, n: number) => number[] {
  const orders = useRef(new Map<string, number[]>());

  return useCallback((key: string, n: number) => {
    const existing = orders.current.get(key);

    if (existing && existing.length === n) return existing;

    const order = shuffledIndices(n);

    orders.current.set(key, order);

    return order;
  }, []);
}
