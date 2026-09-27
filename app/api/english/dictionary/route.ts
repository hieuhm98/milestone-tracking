import { NextResponse } from "next/server";
import { getDictionaryIndex, lookupEntry } from "@/lib/server/dictionaryIndex";
import { DICT_PAGE_SIZE, matchRank, normalizeTerm, type DictionaryHit } from "@/lib/dictionary";

export const runtime = "nodejs";

/** Hard ceiling on one page, whatever the client asks for. */
const MAX_LIMIT = 100;

/**
 * GET `?word=<w>` — one entry with its course sentences.
 * GET `?q=&letter=&pos=&course=1&offset=&limit=` — the filtered word list.
 *
 * Both read the in-memory index (word bank + every vocab.json), so a search
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

    return NextResponse.json({ entry }, headers ? { headers } : undefined);
  }

  const term = normalizeTerm(url.searchParams.get("q") ?? "");
  const letter = normalizeTerm(url.searchParams.get("letter") ?? "").slice(0, 1);
  const pos = normalizeTerm(url.searchParams.get("pos") ?? "");
  const courseOnly = url.searchParams.get("course") === "1";
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || DICT_PAGE_SIZE));

  const matches: { key: string; rank: number }[] = [];

  for (const key of index.sorted) {
    const entry = index.byWord.get(key)!;

    if (term && !key.includes(term)) continue;

    if (letter && !key.startsWith(letter)) continue;

    if (pos && entry.pos !== pos) continue;

    if (courseOnly && entry.courseCount === 0) continue;

    matches.push({ key, rank: matchRank(key, term) });
  }

  // `sorted` is already alphabetical, so a stable sort by rank alone gives
  // exact match → prefix → contains, each group still in dictionary order.
  matches.sort((a, b) => a.rank - b.rank);

  const items: DictionaryHit[] = matches.slice(offset, offset + limit).map(({ key }) => {
    const { word: display, pos: code, ipa, meaningVi, meaningEn, courseCount, inBank } = index.byWord.get(key)!;

    return { word: display, pos: code, ipa, meaningVi, meaningEn, courseCount, inBank };
  });

  return NextResponse.json(
    { total: matches.length, items, bank: index.bank },
    headers ? { headers } : undefined
  );
}
