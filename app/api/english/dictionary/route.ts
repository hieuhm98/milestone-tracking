import { NextResponse } from "next/server";
import { getDictionaryIndex, lookupEntry } from "@/lib/server/dictionaryIndex";
import { lookupSenses } from "@/lib/server/wordSenses";
import { DICT_PAGE_SIZE, LEVELS, matchRank, normalizeTerm, type DictionaryHit, type Level } from "@/lib/dictionary";

export const runtime = "nodejs";

/** Hard ceiling on one page, whatever the client asks for. */
const MAX_LIMIT = 100;

/**
 * GET `?word=<w>` — one entry with its course sentences and every sense
 *   (data/dictionary/<letter>.db, read per request; the list never needs it).
 * GET `?q=&letter=&pos=&level=&course=1&offset=&limit=` — the filtered word list.
 *   With a search term, results run exact → prefix → contains, and within each
 *   group the most-used words first, so "pres" leads with "present" and
 *   "president", not "presage". Browsing (no term) stays alphabetical and
 *   leaves out the ~7.5k idiom entries ("a bad workman quarrels with his
 *   tools" would crowd the letter A) unless the phrase filter asks for them.
 *
 * Both read the in-memory index (data/dictionary + every vocab.json), so a search
 * never touches disk after the first request.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const index = getDictionaryIndex();
  const production = process.env.NODE_ENV === "production";
  // The dictionary only changes on deploy.
  const headers = production ? { "Cache-Control": "public, max-age=600" } : undefined;
  const word = url.searchParams.get("word");

  if (word) {
    const entry = lookupEntry(index, word);

    if (!entry) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const senses = lookupSenses(word);

    return NextResponse.json({ entry: senses ? { ...entry, senses } : entry }, headers ? { headers } : undefined);
  }

  const term = normalizeTerm(url.searchParams.get("q") ?? "");
  const letter = normalizeTerm(url.searchParams.get("letter") ?? "").slice(0, 1);
  const pos = normalizeTerm(url.searchParams.get("pos") ?? "");
  const courseOnly = url.searchParams.get("course") === "1";
  const levelParam = url.searchParams.get("level") ?? "";
  const level = (LEVELS as readonly string[]).includes(levelParam) ? (levelParam as Level) : null;
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || DICT_PAGE_SIZE));

  const matches: { key: string; rank: number; frequency: number }[] = [];

  for (const key of index.sorted) {
    const entry = index.byWord.get(key)!;

    if (term && !key.includes(term)) continue;

    if (letter && !key.startsWith(letter)) continue;

    if (pos && entry.pos !== pos) continue;

    if (courseOnly && entry.courseCount === 0) continue;

    if (level && entry.level !== level) continue;

    if (!term && entry.phrase && pos !== "phrase") continue;

    matches.push({ key, rank: matchRank(key, term), frequency: term ? entry.rank ?? Infinity : 0 });
  }

  // `sorted` is already alphabetical and the sort is stable, so ties keep
  // dictionary order. Without a term every frequency is 0: plain A–Z browsing.
  // (Unranked words are Infinity, and Infinity - Infinity is NaN, so compare.)
  const byFrequency = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

  matches.sort((a, b) => a.rank - b.rank || byFrequency(a.frequency, b.frequency));

  const items: DictionaryHit[] = matches.slice(offset, offset + limit).map(({ key }) => {
    const { word: display, pos: code, ipa, meaningVi, meaningEn, courseCount, inBank, level: lvl } =
      index.byWord.get(key)!;

    return { word: display, pos: code, ipa, meaningVi, meaningEn, courseCount, inBank, level: lvl };
  });

  return NextResponse.json(
    { total: matches.length, items, bank: index.bank },
    headers ? { headers } : undefined
  );
}
