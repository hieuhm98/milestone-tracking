import { NextResponse } from "next/server";
import { getSupabaseAdmin, userFromRequest } from "@/lib/supabase/admin";
import { getPrompt, TASK_RULES } from "@/lib/writing/prompts";
import { measure } from "@/lib/writing/metrics";
import { applyLengthCap, combineGrammar, grammarBandFromLints, lexicalBandFromSignals, overall } from "@/lib/writing/bands";
import { lintEssay } from "@/lib/server/writingHarper";
import { estimateWithoutAi } from "@/lib/writing/fallback";
import { assessWithGemini, geminiConfigured, type AiAssessment } from "@/lib/server/writingGemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/english/writing {promptId, text}
//
// Scores one IELTS Writing answer:
//   1. Harper (offline, rule-based) finds spelling and grammar slips → the
//      Grammatical Range & Accuracy band and the highlighted corrections.
//   2. Plain metrics (length, paragraphs, linking words, word variety).
//   3. Gemini judges Task Response and Coherence, which no rule engine can, and
//      second-opinions the other two. If it is unavailable the answer still
//      comes back scored by a rule-based estimate (`fallback`), capped at 6.5.

const MAX_CHARS = 6000;
const MIN_WORDS_TO_SCORE = 30;
const DAILY_LIMIT = 8;

// Per server instance, so on serverless it is a guard against runaway use, not
// an exact quota. Gemini's own free-tier limits are the hard ceiling.
const usage = new Map<string, { day: string; n: number }>();

function underLimit(who: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = usage.get(who);

  if (!entry || entry.day !== day) {
    usage.set(who, { day, n: 1 });

    return true;
  }

  if (entry.n >= DAILY_LIMIT) return false;

  entry.n += 1;

  return true;
}

export async function POST(request: Request) {
  let who = request.headers.get("x-forwarded-for") ?? "local";

  // With accounts configured the site is closed; keep the model key behind login.
  if (getSupabaseAdmin()) {
    const user = await userFromRequest(request);

    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    who = user.id;
  }

  let body: { promptId?: unknown; text?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = typeof body.promptId === "string" ? getPrompt(body.promptId) : undefined;
  const text = typeof body.text === "string" ? body.text.slice(0, MAX_CHARS) : "";

  if (!prompt) return NextResponse.json({ error: "unknown_prompt" }, { status: 400 });

  const metrics = measure(text);

  if (metrics.words < MIN_WORDS_TO_SCORE) {
    return NextResponse.json({ error: "too_short", minWords: MIN_WORDS_TO_SCORE }, { status: 422 });
  }

  if (!underLimit(who)) return NextResponse.json({ error: "daily_limit", limit: DAILY_LIMIT }, { status: 429 });

  const rules = TASK_RULES[prompt.task];
  let lints;

  try {
    lints = await lintEssay(text);
  } catch (e) {
    return NextResponse.json({ error: "checker_failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  const spelling = lints.filter((l) => l.kind === "Spelling").length;
  const per100 = (n: number) => (n / metrics.words) * 100;
  const harperGrammar = grammarBandFromLints(per100(lints.length));

  let ai: AiAssessment | null = null;
  let aiError: string | null = null;

  if (geminiConfigured()) {
    try {
      ai = await assessWithGemini({
        task: prompt.task,
        question: prompt.question,
        tableText: prompt.table
          ? [prompt.table.caption, ["", ...prompt.table.columns].join(" | "), ...prompt.table.rows.map((r) => [r.label, ...r.values].join(" | "))].join("\n")
          : undefined,
        essay: text,
        words: metrics.words,
      });
    } catch (e) {
      aiError = e instanceof Error ? e.message : String(e);
    }
  } else {
    aiError = "gemini_not_configured";
  }

  // No AI judge (quota spent, key missing, outage): fall back to the rule-based
  // estimate so the learner still gets a band — flagged and capped at 6.5.
  const fallback = ai ? null : estimateWithoutAi(prompt, text, metrics, rules.minWords);
  const grammar = combineGrammar(harperGrammar, ai ? ai.grammar.band : null);
  const lexical = ai ? ai.lexical.band : lexicalBandFromSignals(per100(spelling), metrics);
  const taskResponse = ai
    ? applyLengthCap(ai.offTopic ? Math.min(ai.taskResponse.band, 3) : ai.taskResponse.band, metrics.words, rules.minWords)
    : applyLengthCap(fallback!.taskResponse, metrics.words, rules.minWords);
  const coherence = ai ? ai.coherence.band : fallback!.coherence;
  const overallBand = overall([taskResponse, coherence, lexical, grammar]);

  return NextResponse.json({
    promptId: prompt.id,
    metrics,
    minWords: rules.minWords,
    lints,
    bands: { taskResponse, coherence, lexical, grammar, overall: overallBand },
    harper: { errorsPer100: Math.round(per100(lints.length) * 10) / 10, spelling, grammarBand: harperGrammar },
    ai,
    aiError,
    // True when the AI judge was unavailable and Task/Coherence are rule-based estimates.
    fallback: fallback ? { notes: fallback.notes, summary: fallback.summary } : null,
  });
}
