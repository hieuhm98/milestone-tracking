// Home of the "IELTS Speaking — Band 6 vs Band 9" section: hero and totals, how
// to use and navigate the page, the four criteria, the two "five moves" lists,
// and the main contents. A server component — the data layer is read here and
// only the interactive parts below are client components.

import type { Metadata } from "next";
import SpeakingShell from "@/components/ielts/SpeakingShell";
import HomeIntro from "@/components/ielts/HomeIntro";
import CriteriaOverview from "@/components/ielts/CriteriaOverview";
import FiveMoves from "@/components/ielts/FiveMoves";
import HomeContents from "@/components/ielts/HomeContents";
import { getIntro, getToc } from "@/lib/ielts/data";

export const metadata: Metadata = {
  title: "IELTS Speaking — Band 6 vs Band 9",
};

export default async function IeltsSpeakingHome() {
  const [toc, intro] = await Promise.all([getToc(), getIntro()]);

  return (
    <SpeakingShell toc={toc}>
      <div className="max-w-4xl space-y-10 pb-10">
        <HomeIntro
          intro={intro}
          stats={toc.stats}
          firstPart1={toc.part1[0]?.slug}
          firstCard={toc.part23[0]?.slug}
        />

        <CriteriaOverview criteria={intro.criteria} />

        <FiveMoves
          id="moves-part1"
          part="part1"
          title={intro.movesPart1.title}
          steps={intro.movesPart1.steps}
        />

        <FiveMoves
          id="moves-part23"
          part="part23"
          title={intro.movesPart23.title}
          titleVi={intro.movesPart23.titleVi}
          steps={intro.movesPart23.steps}
          tip={intro.movesPart23.tip}
        />

        <HomeContents toc={toc} />
      </div>
    </SpeakingShell>
  );
}
