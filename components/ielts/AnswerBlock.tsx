"use client";

// One answer frame: the BAND 6 / BAND 9 label with the counts from the source
// header, then the answer itself rebuilt from its segments.
//
// The answer text is source English and stays English in both language modes;
// only the "words" / "phrases to learn" labels switch.

import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Answer, VocabRow } from "@/lib/ielts/types";
import { BAND } from "./tokens";
import IpaWord from "./IpaWord";
import Phrase from "./Phrase";

interface Props {
  band: 6 | 9;
  answer: Answer;
  /** Rows the highlighted phrases point into. */
  vocabulary: VocabRow[];
  /** Unit id, used to address the vocabulary rows. */
  unitId: string;
  id?: string;
}

export default function AnswerBlock({ band, answer, vocabulary, unitId, id }: Props) {
  const { t } = useLang();
  const style = band === 6 ? BAND.band6 : BAND.band9;

  return (
    <div id={id} className={cn("scroll-mt-28 rounded-xl rounded-l-md p-4 sm:p-5", style.frame)}>
      <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wider">
        <span className={style.label}>Band {band}</span>
        <span className={cn("font-normal normal-case tracking-normal", style.count)}>
          {answer.words} {t("ielts.count.words")}
          {typeof answer.phrases === "number" && (
            <> · {answer.phrases} {t("ielts.count.phrases")}</>
          )}
        </span>
      </p>

      {/* `whitespace-pre-line` keeps the source's paragraph breaks while the
          segments stay in one inline flow (a phrase may straddle a line). */}
      <p className="whitespace-pre-line text-zinc-800 dark:text-zinc-100">
        {answer.segments.map((segment, index) => {
          if (segment.t === "text") return <span key={index}>{segment.v}</span>;

          if (segment.t === "ipa") return <IpaWord key={index} word={segment.v} ipa={segment.ipa} />;

          const row: VocabRow | undefined = vocabulary[segment.vocabIndex];

          return (
            <Phrase
              key={index}
              text={segment.v}
              vietnamese={row?.vietnamese}
              target={row ? `${unitId}-v${segment.vocabIndex}` : undefined}
            />
          );
        })}
      </p>
    </div>
  );
}
