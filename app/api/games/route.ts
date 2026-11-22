import { NextResponse } from "next/server";
import { getGroup } from "@/lib/groups";
import { buildPuzzle } from "@/lib/games/build";
import { puzzleDay } from "@/lib/games/day";
import { isGameId, type DailyPuzzle } from "@/lib/games/types";
import { isCommonWord } from "@/lib/server/wordLevel";
import { loadCourseMaterial } from "@/lib/server/gameMaterial";

// The puzzle depends on the date, so it must never be cached or prerendered.
export const dynamic = "force-dynamic";

// A puzzle is the same for everyone all day, so build it once per course, game and day.
// Only today's entries are kept: the map is cleared when the day rolls over.
const built = new Map<string, DailyPuzzle | null>();
let builtDay = "";

/** GET /api/games?group=sa&game=wordle|sort|sequence → today's puzzle for that course. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group") ?? "";
  const game = searchParams.get("game") ?? "";

  if (!getGroup(group)) return NextResponse.json({ error: "unknown_course" }, { status: 404 });

  if (!isGameId(game)) return NextResponse.json({ error: "unknown_game" }, { status: 404 });

  const day = puzzleDay();

  if (day !== builtDay) {
    built.clear();
    builtDay = day;
  }

  const cacheKey = `${group}:${game}`;

  if (!built.has(cacheKey)) {
    const puzzle = buildPuzzle(game, loadCourseMaterial(group), day, group, { isCommon: isCommonWord });

    built.set(cacheKey, puzzle ? { day, group, puzzle } : null);
  }

  const body = built.get(cacheKey);

  if (!body) return NextResponse.json({ error: "no_puzzle" }, { status: 404 });

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
