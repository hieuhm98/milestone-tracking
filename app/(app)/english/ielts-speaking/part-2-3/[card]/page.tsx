// One cue card: header, the card's question list, the Part 2 long turn (cue card
// + 1-minute notes + answers), then every Part 3 follow-up, then the
// neighbouring cards.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SpeakingShell from "@/components/ielts/SpeakingShell";
import SectionList, { type SectionListItem } from "@/components/ielts/SectionList";
import QuestionUnitView from "@/components/ielts/QuestionUnitView";
import PageNav, { type PageNavTarget } from "@/components/ielts/PageNav";
import NoPart3Badge from "@/components/ielts/NoPart3Badge";
import { PART } from "@/components/ielts/tokens";
import {
  cardHref,
  cardNumber,
  flattenToc,
  questionNeighbours,
  sectionNeighbours,
} from "@/components/ielts/navigation";
import { getCard, getCardSlugs, getToc } from "@/lib/ielts/data";

interface Props {
  params: { card: string };
}

export async function generateStaticParams() {
  const slugs = await getCardSlugs();

  return slugs.map((card) => ({ card }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = await getCard(cardNumber(params.card));

  if (!card) return { title: "IELTS Speaking — Part 2 & 3" };

  return { title: `Card ${card.number} — ${card.title} · IELTS Speaking Part 2 & 3` };
}

export default async function CardPage({ params }: Props) {
  const [toc, card] = await Promise.all([getToc(), getCard(cardNumber(params.card))]);

  if (!card) notFound();

  const entries = flattenToc(toc);
  const { prev, next } = sectionNeighbours(toc.part23, card.slug);

  const items: SectionListItem[] = [
    { anchor: "part2", marker: "Part 2 ·", text: card.prompt },
    ...card.part3.map((question) => ({
      anchor: `p3-${question.number}`,
      marker: `Part 3 · ${question.number}`,
      text: question.question,
    })),
  ];

  const target = (section: typeof prev): PageNavTarget | null =>
    section ? { href: cardHref(section.slug), title: `${section.label} — ${section.title}` } : null;

  const part2Neighbours = questionNeighbours(entries, card.part2.id);

  return (
    <SpeakingShell
      toc={toc}
      activeSlug={card.slug}
      breadcrumb={`Part 2 & 3 › ${card.group} › Card ${card.number} — ${card.title}`}
    >
      <div className="max-w-4xl space-y-6 pb-10">
        <header>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${PART.part23.text}`}>
            Part 2 &amp; 3 › {card.group}
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Part 2 · Card {card.number} — {card.title}
          </h1>

          {card.titleVi && <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{card.titleVi}</p>}
        </header>

        <SectionList items={items} part="part23" />

        <QuestionUnitView
          unit={card.part2}
          anchor="part2"
          part="part23"
          cueCard={card}
          prev={part2Neighbours.prev}
          next={part2Neighbours.next}
          listAnchor="questions"
        />

        {card.part3.length > 0 ? (
          <div className="space-y-8">
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${PART.part23.text}`}>
              Part 3 · Discussion
            </p>

            {card.part3.map((question) => {
              const neighbours = questionNeighbours(entries, question.id);

              return (
                <QuestionUnitView
                  key={question.id}
                  unit={question}
                  anchor={`p3-${question.number}`}
                  eyebrow={`Part 3 · ${question.number}`}
                  part="part23"
                  prev={neighbours.prev}
                  next={neighbours.next}
                  listAnchor="questions"
                />
              );
            })}
          </div>
        ) : (
          <NoPart3Badge />
        )}

        <PageNav part="part23" prev={target(prev)} next={target(next)} />
      </div>
    </SpeakingShell>
  );
}
