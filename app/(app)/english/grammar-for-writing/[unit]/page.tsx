// One unit of Grammar for Writing. A server component: the data layer is read
// here and only the reading view below is a client component. Units are
// authored one at a time, so `generateStaticParams` lists the files that exist
// and anything else falls through to `notFound()`.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GrammarShell from "@/components/grammar/GrammarShell";
import UnitView from "@/components/grammar/UnitView";
import type { OutlineEntry } from "@/components/grammar/ContentsTree";
import type { NavTarget } from "@/components/grammar/PageNav";
import { flattenUnits, partLabel, partOf, unitHref, unitNeighbours } from "@/components/grammar/navigation";
import {
  getReferenceSlugs,
  getReviewParts,
  getSyllabus,
  getTraps,
  getUnit,
  getUnitIds,
} from "@/lib/grammar/data";

interface Props {
  params: { unit: string };
}

export async function generateStaticParams() {
  const ids = await getUnitIds();

  return ids.map((unit) => ({ unit }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const unit = await getUnit(params.unit);

  if (!unit) return { title: "Grammar for Writing" };

  return { title: `Unit ${unit.number} — ${unit.title} · Grammar for Writing` };
}

export default async function GrammarUnitPage({ params }: Props) {
  const [syllabus, unit, traps, reviewParts, referenceSlugs] = await Promise.all([
    getSyllabus(),
    getUnit(params.unit),
    getTraps(),
    getReviewParts(),
    getReferenceSlugs(),
  ]);

  if (!unit) notFound();

  const part = partOf(syllabus, unit.id);
  const units = flattenUnits(syllabus);
  const { prev, next } = unitNeighbours(units, unit.id);

  const byId = new Map(traps.map((trap) => [trap.id, trap]));
  const unitTraps = unit.traps.map((id) => byId.get(id)).filter((trap): trap is NonNullable<typeof trap> => Boolean(trap));

  const outline: OutlineEntry[] = [
    { anchor: "focus", label: "Grammar Focus" },
    { anchor: "pretest", label: "Pretest" },
    { anchor: "context", label: "Grammar in Context" },
    ...unit.sections.map((section) => ({ anchor: section.id, label: section.title })),
    { anchor: "traps", label: "Vietnamese Learner Traps" },
    { anchor: "editing", label: "Editing Practice" },
    { anchor: "topics", label: "Writing Topics" },
  ];

  const target = (entry: typeof prev): NavTarget | null =>
    entry ? { href: unitHref(entry.id), title: `${entry.number}. ${entry.title}` } : null;

  const partName = part ? partLabel(part) : `Part ${unit.part}`;

  return (
    <GrammarShell
      syllabus={syllabus}
      reviewParts={reviewParts}
      referenceSlugs={referenceSlugs}
      activeUnitId={unit.id}
      outline={outline}
      breadcrumb={`${partName} › Unit ${unit.number} — ${unit.title}`}
    >
      <UnitView
        unit={unit}
        traps={unitTraps}
        partTitle={partName}
        prev={target(prev)}
        next={target(next)}
      />
    </GrammarShell>
  );
}
