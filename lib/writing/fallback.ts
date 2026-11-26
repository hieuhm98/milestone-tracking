import { roundBand, type EssayMetrics } from "./metrics";
import type { WritingPrompt } from "./prompts";
import { tokenize } from "./metrics";

// A rule-based stand-in for the AI judge, used when every Gemini model is out
// of free quota or down. It cannot read for meaning, so it measures what it
// can see (length, structure, linking words, overlap with the question's
// vocabulary, data coverage) and is capped at 6.5 so a polished-looking but
// shallow essay is never scored as excellent. The UI labels the result.

const CAP = 6.5;

const STOP = new Set(
  "the a an and or but of to in on at for with by from as is are was were be it its this that these those they their what which who how why do does you your should would could can may might some people more most than then also very".split(" ")
);

export interface FallbackEstimate {
  taskResponse: number;
  coherence: number;
  notes: { en: string; vi: string }[];
  /** What each rule-based band was measured from. */
  summary: { taskResponse: { en: string; vi: string }; coherence: { en: string; vi: string } };
}

const clamp = (n: number) => Math.min(CAP, Math.max(3, roundBand(n)));

export function estimateWithoutAi(prompt: WritingPrompt, text: string, m: EssayMetrics, minWords: number): FallbackEstimate {
  const notes: { en: string; vi: string }[] = [];
  const lower = text.toLowerCase();
  const essayWords = new Set(tokenize(text));

  // Coverage: how many of the question's content words does the answer use?
  const keywords = Array.from(new Set(tokenize(prompt.question).filter((w) => w.length > 3 && !STOP.has(w))));
  const coverage = keywords.length ? keywords.filter((k) => essayWords.has(k) || essayWords.has(k.replace(/s$/, ""))).length / keywords.length : 1;

  let task = 5;

  if (coverage >= 0.5) task += 0.5;
  if (coverage < 0.25) task -= 1.5;

  if (prompt.task === "task1") {
    const figures = prompt.table ? prompt.table.rows.flatMap((r) => r.values.map(String)) : [];
    const used = figures.filter((f) => new RegExp(`\\b${f}\\b`).test(text)).length;
    const hasOverview = /\b(overall|in general|generally|in summary|to summarise|to summarize)\b/.test(lower);
    const compares = /\b(higher|lower|more than|less than|whereas|while|compared|highest|lowest|increase|decrease|rose|fell|dropped|grew)\b/.test(lower);

    if (used >= 6) task += 0.5;
    if (used === 0) task -= 1;
    if (hasOverview) task += 0.5;
    else notes.push({ en: "Add a clear overview sentence (\"Overall, …\") that states the main trends.", vi: "Thêm câu tổng quan rõ ràng (\"Overall, …\") nêu các xu hướng chính." });
    if (!compares) task -= 0.5;
  } else {
    const hasConclusion = /\b(in conclusion|to conclude|in summary|overall|to sum up)\b/.test(lower);
    const hasPosition = /\b(i believe|i think|i agree|i disagree|in my opinion|in my view|i would argue|i am convinced)\b/.test(lower);

    if (hasConclusion) task += 0.5;
    else notes.push({ en: "Finish with a conclusion that restates your position.", vi: "Kết bài bằng đoạn kết luận nhắc lại quan điểm của bạn." });
    if (hasPosition) task += 0.5;
    if (m.paragraphs >= 4) task += 0.5;
  }

  if (coverage < 0.5) notes.push({ en: "Make sure every part of the question is answered, using its key terms.", vi: "Hãy trả lời đủ mọi phần của đề bài, dùng các từ khoá của đề." });

  let coherence = 5;

  if (m.paragraphs >= (prompt.task === "task2" ? 4 : 3)) coherence += 1;
  else notes.push({ en: "Use clear paragraphs: introduction, body paragraphs, conclusion.", vi: "Chia đoạn rõ ràng: mở bài, thân bài, kết bài." });

  if (m.connectors.length >= 5) coherence += 0.5;
  if (m.connectors.length >= 8) coherence += 0.5;
  if (m.connectors.length < 3) coherence -= 1;
  if (m.sentenceLengthSpread >= 5) coherence += 0.5;
  if (m.avgSentenceLength > 32) coherence -= 0.5;

  // Under-length answers cannot do the task fully.
  const ratio = m.words / minWords;

  if (ratio < 1) task -= ratio >= 0.8 ? 0.5 : 1.5;

  const percent = Math.round(coverage * 100);
  const summary = {
    taskResponse: {
      en: `Rule-based: your answer uses ${percent}% of the question's key words and has ${m.words} of at least ${minWords} words. Ideas and accuracy were not read.`,
      vi: `Chấm theo quy tắc: bài dùng ${percent}% từ khoá của đề và có ${m.words} từ (yêu cầu ít nhất ${minWords}). Chưa đánh giá nội dung và độ chính xác của ý.`,
    },
    coherence: {
      en: `Rule-based: ${m.paragraphs} paragraph(s), ${m.connectors.length} different linking device(s), ${m.avgSentenceLength} words per sentence on average. The logic between ideas was not read.`,
      vi: `Chấm theo quy tắc: ${m.paragraphs} đoạn, ${m.connectors.length} từ nối khác nhau, trung bình ${m.avgSentenceLength} từ mỗi câu. Chưa đánh giá mạch logic giữa các ý.`,
    },
  };

  return { taskResponse: clamp(task), coherence: clamp(coherence), notes: notes.slice(0, 3), summary };
}
