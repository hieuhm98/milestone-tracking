// Every Vietnamese Learner Trap in one filterable list. The explorer reads
// `?mine=1` (the home page's "practise my weak points" link), so it sits behind
// a Suspense boundary — `useSearchParams` needs one on a statically generated
// page.

import { Suspense } from "react";
import type { Metadata } from "next";
import GrammarShell from "@/components/grammar/GrammarShell";
import TrapsExplorer from "@/components/grammar/TrapsExplorer";
import { getReferenceSlugs, getReviewParts, getSyllabus, getTraps } from "@/lib/grammar/data";

export const metadata: Metadata = {
  title: "Vietnamese Learner Traps · Grammar for Writing",
};

export default async function GrammarTrapsPage() {
  const [syllabus, traps, reviewParts, referenceSlugs] = await Promise.all([
    getSyllabus(),
    getTraps(),
    getReviewParts(),
    getReferenceSlugs(),
  ]);

  return (
    <GrammarShell
      syllabus={syllabus}
      reviewParts={reviewParts}
      referenceSlugs={referenceSlugs}
      breadcrumb="Grammar for Writing › Vietnamese Learner Traps"
    >
      <Suspense fallback={null}>
        <TrapsExplorer traps={traps} syllabus={syllabus} />
      </Suspense>
    </GrammarShell>
  );
}
