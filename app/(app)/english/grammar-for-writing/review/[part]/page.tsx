// A Part review — one per Part, written after its units are authored. Only the
// Parts with a review file are generated; anything else falls through to
// `notFound()` rather than breaking the build.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GrammarShell from "@/components/grammar/GrammarShell";
import ReviewView from "@/components/grammar/ReviewView";
import {
  getReferenceSlugs,
  getReview,
  getReviewParts,
  getSyllabus,
  getTraps,
} from "@/lib/grammar/data";

interface Props {
  params: { part: string };
}

export async function generateStaticParams() {
  const parts = await getReviewParts();

  return parts.map((part) => ({ part: part.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const review = await getReview(params.part);

  if (!review) return { title: "Grammar for Writing" };

  return { title: `${review.title} · Grammar for Writing` };
}

export default async function GrammarReviewPage({ params }: Props) {
  const [syllabus, review, traps, reviewParts, referenceSlugs] = await Promise.all([
    getSyllabus(),
    getReview(params.part),
    getTraps(),
    getReviewParts(),
    getReferenceSlugs(),
  ]);

  if (!review) notFound();

  const part = syllabus.parts.find((entry) => entry.id === review.part) ?? null;

  return (
    <GrammarShell
      syllabus={syllabus}
      reviewParts={reviewParts}
      referenceSlugs={referenceSlugs}
      breadcrumb={`Part ${review.part}${part ? ` · ${part.title}` : ""} › ${review.title}`}
    >
      <ReviewView review={review} part={part} traps={traps} />
    </GrammarShell>
  );
}
