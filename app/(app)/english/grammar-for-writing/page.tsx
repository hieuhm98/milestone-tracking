// Home of the "Grammar for Writing" section: hero and totals, how a unit
// works, the path of 19 units in four Parts, and the way out to the traps and
// reference pages. A server component — the data layer is read here, including
// each authored unit's item count so the path can show progress.

import type { Metadata } from "next";
import GrammarShell from "@/components/grammar/GrammarShell";
import GrammarHome from "@/components/grammar/GrammarHome";
import { gradableTotal } from "@/components/grammar/scoring";
import {
  getReferenceSlugs,
  getReviewParts,
  getSyllabus,
  getTraps,
  getUnit,
  getUnitIds,
} from "@/lib/grammar/data";

export const metadata: Metadata = {
  title: "Grammar for Writing",
};

export default async function GrammarForWritingHome() {
  const [syllabus, traps, unitIds, reviewParts, referenceSlugs] = await Promise.all([
    getSyllabus(),
    getTraps(),
    getUnitIds(),
    getReviewParts(),
    getReferenceSlugs(),
  ]);

  const units = await Promise.all(unitIds.map((id) => getUnit(id)));
  const unitTotals: Record<string, number> = {};

  for (const unit of units) {
    if (unit) unitTotals[unit.id] = gradableTotal(unit);
  }

  return (
    <GrammarShell syllabus={syllabus} reviewParts={reviewParts} referenceSlugs={referenceSlugs}>
      <GrammarHome
        syllabus={syllabus}
        trapCount={traps.length}
        unitTotals={unitTotals}
        reviewParts={reviewParts}
        referenceSlugs={referenceSlugs}
      />
    </GrammarShell>
  );
}
