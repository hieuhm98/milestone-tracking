// A reference page — irregular verbs, spelling rules, punctuation and so on.
// Only the slugs with an authored file are generated.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GrammarShell from "@/components/grammar/GrammarShell";
import ReferenceView from "@/components/grammar/ReferenceView";
import {
  getReference,
  getReferenceSlugs,
  getReviewParts,
  getSyllabus,
} from "@/lib/grammar/data";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getReferenceSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getReference(params.slug);

  if (!page) return { title: "Grammar for Writing" };

  return { title: `${page.title} · Grammar for Writing` };
}

export default async function GrammarReferencePage({ params }: Props) {
  const [syllabus, page, reviewParts, referenceSlugs] = await Promise.all([
    getSyllabus(),
    getReference(params.slug),
    getReviewParts(),
    getReferenceSlugs(),
  ]);

  if (!page) notFound();

  return (
    <GrammarShell
      syllabus={syllabus}
      reviewParts={reviewParts}
      referenceSlugs={referenceSlugs}
      breadcrumb={`Grammar for Writing › ${page.title}`}
    >
      <ReferenceView page={page} />
    </GrammarShell>
  );
}
