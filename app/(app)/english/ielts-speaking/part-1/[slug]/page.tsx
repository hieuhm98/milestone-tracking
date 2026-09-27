// One Part 1 topic: header, the list of its questions, one question unit each,
// and the neighbouring sections at the foot. Statically generated from the data
// layer's slug list.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SpeakingShell from "@/components/ielts/SpeakingShell";
import SectionList, { type SectionListItem } from "@/components/ielts/SectionList";
import QuestionUnitView from "@/components/ielts/QuestionUnitView";
import PageNav, { type PageNavTarget } from "@/components/ielts/PageNav";
import { PART } from "@/components/ielts/tokens";
import {
  flattenToc,
  part1Href,
  questionNeighbours,
  sectionNeighbours,
} from "@/components/ielts/navigation";
import { getPart1Slugs, getPart1Topic, getToc } from "@/lib/ielts/data";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getPart1Slugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = await getPart1Topic(params.slug);

  if (!topic) return { title: "IELTS Speaking — Part 1" };

  return { title: `${topic.label} — ${topic.title} · IELTS Speaking Part 1` };
}

export default async function Part1TopicPage({ params }: Props) {
  const [toc, topic] = await Promise.all([getToc(), getPart1Topic(params.slug)]);

  if (!topic) notFound();

  const entries = flattenToc(toc);
  const { prev, next } = sectionNeighbours(toc.part1, topic.slug);

  const items: SectionListItem[] = topic.questions.map((question) => ({
    anchor: `q${question.number}`,
    marker: `${question.number}.`,
    text: question.question,
  }));

  const target = (section: typeof prev): PageNavTarget | null =>
    section ? { href: part1Href(section.slug), title: `${section.label} — ${section.title}` } : null;

  return (
    <SpeakingShell
      toc={toc}
      activeSlug={topic.slug}
      breadcrumb={`Part 1 › ${topic.group} › ${topic.label} — ${topic.title}`}
    >
      <div className="max-w-4xl space-y-6 pb-10">
        <header>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${PART.part1.text}`}>
            Part 1 › {topic.group}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {topic.label} — {topic.title}
          </h1>

          {topic.titleVi && <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{topic.titleVi}</p>}

          <p className="mt-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${PART.part1.chip}`}>
              Q{topic.range[0]}–Q{topic.range[1]}
            </span>
          </p>

          {topic.note && (
            <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {topic.note}
            </p>
          )}
        </header>

        <SectionList items={items} part="part1" />

        <div className="space-y-8">
          {topic.questions.map((question) => {
            const neighbours = questionNeighbours(entries, question.id);

            return (
              <QuestionUnitView
                key={question.id}
                unit={question}
                anchor={`q${question.number}`}
                part="part1"
                prev={neighbours.prev}
                next={neighbours.next}
                listAnchor="questions"
              />
            );
          })}
        </div>

        <PageNav part="part1" prev={target(prev)} next={target(next)} />
      </div>
    </SpeakingShell>
  );
}
