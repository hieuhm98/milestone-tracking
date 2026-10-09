"use client";

import ArticleRenderer from "./ArticleRenderer";
import type { Accent } from "./articleTokens";
import BilingualPair from "@/components/BilingualPair";
import { splitArticle } from "@/lib/lessons";

interface Props {
  vi: string;
  en: string;
  /** 1-based `## ` section indices to show; omit for the whole article. */
  sections?: number[];
  /** The course accent, passed through to every section. */
  accent?: Accent;
}

/**
 * An article rendered in both languages at once, aligned **per `## ` section**
 * rather than as two long columns — so the English and Vietnamese for the same
 * heading always start on the same line, however differently they wrap.
 *
 * Alignment relies on both articles having the same section count, which holds
 * for every topic; if a translation ever falls out of step we fall back to
 * whichever side has content for that row.
 */
export default function BilingualArticle({ vi, en, sections, accent }: Props) {
  const viDoc = splitArticle(vi);
  const enDoc = splitArticle(en);

  const indices =
    sections ?? Array.from({ length: Math.max(viDoc.sections.length, enDoc.sections.length) }, (_, i) => i + 1);

  const showPreamble = sections === undefined && (viDoc.preamble || enDoc.preamble);

  return (
    <div className="space-y-6">
      {showPreamble && (
        <BilingualPair
          labels
          en={<ArticleRenderer content={enDoc.preamble || viDoc.preamble} accent={accent} />}
          vi={<ArticleRenderer content={viDoc.preamble || enDoc.preamble} accent={accent} />}
        />
      )}

      {indices.map((n, row) => {
        const enSection = enDoc.sections[n - 1] ?? viDoc.sections[n - 1] ?? "";
        const viSection = viDoc.sections[n - 1] ?? enDoc.sections[n - 1] ?? "";

        if (!enSection && !viSection) return null;

        return (
          <div
            key={n}
            className="pt-6 first:pt-0 border-t first:border-t-0 border-zinc-200 dark:border-zinc-800"
          >
            <BilingualPair
              labels={row === 0 && !showPreamble}
              en={<ArticleRenderer content={enSection} accent={accent} />}
              vi={<ArticleRenderer content={viSection} accent={accent} />}
            />
          </div>
        );
      })}
    </div>
  );
}
