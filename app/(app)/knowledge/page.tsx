"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { topicStats } from "@/lib/progress";
import { GROUPS, DEFAULT_GROUP, GROUP_ACCENT } from "@/lib/groups";
import GroupIcon from "@/components/GroupIcon";
import { PageError, PageLoading } from "@/components/learn/PageState";

interface StaticTopic {
  slug: string;
  group: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  questionCount?: number;
}

export default function KnowledgePage() {
  const { t, pick } = useLang();
  const { progress } = useProgress();
  const [staticTopics, setStaticTopics] = useState<StaticTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const didInitAccordion = useRef(false);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch("/api/knowledge");

        if (!res.ok) throw new Error(String(res.status));

        const topics: StaticTopic[] = await res.json();

        setStaticTopics(Array.isArray(topics) ? topics : []);
      } catch {
        setError(true);
      }

      setLoading(false);
    }

    void load();
  }, [attempt]);

  // Group topics by their group id, preserving GROUPS order.
  const grouped = GROUPS.map((g) => ({
    group: g,
    topics: staticTopics.filter((tp) => (tp.group ?? DEFAULT_GROUP) === g.id),
  })).filter((section) => section.topics.length > 0);

  // Open the first group once, so the page isn't empty but nothing is scrolled.
  useEffect(() => {
    if (!didInitAccordion.current && grouped.length > 0) {
      didInitAccordion.current = true;
      setOpenGroups(new Set([grouped[0].group.id]));
    }
  }, [grouped]);

  if (loading) return <PageLoading />;

  if (error) return <PageError onRetry={() => setAttempt((n) => n + 1)} />;

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">{t("knowledge.title")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{t("knowledge.subtitle")}</p>
      </div>

      {grouped.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
          {pick("Chưa có chủ đề nào.", "No topics are available yet.")}
        </p>
      )}

      <div className="space-y-3">
        {grouped.map(({ group, topics }) => {
          const accent = GROUP_ACCENT[group.accent];
          const isOpen = openGroups.has(group.id);
          const panelId = `knowledge-group-${group.id}`;

          return (
            <section key={group.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {/* The heading wraps the button (a heading may not sit inside one). */}
              <h2>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <GroupIcon group={group.id} className="text-xl text-zinc-600 dark:text-zinc-300" />
                  <span className="block min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {pick(group.label, group.labelEn)}
                      </span>
                      <span className={`text-xs font-normal px-2 py-0.5 rounded border shrink-0 ${accent.badge}`}>
                        {topics.length} {t("knowledge.topics")}
                      </span>
                    </span>
                    {!isOpen && (
                      <span className="block text-xs font-normal text-zinc-500 mt-0.5 truncate">
                        {pick(group.description, group.descriptionEn)}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </h2>

              {isOpen && (
                <div id={panelId} className="px-4 pb-4 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-4 mt-3">
                    {pick(group.description, group.descriptionEn)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {topics.map((topic, i) => {
                      const stat = topicStats(progress, topic.slug, topic.questionCount);

                      return (
                        <Link
                          key={topic.slug}
                          href={`/knowledge/${topic.slug}`}
                          className="card hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-0.5 shrink-0 w-6">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white text-sm">
                                {pick(topic.title, topic.titleEn)}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                {pick(topic.description, topic.descriptionEn)}
                              </div>
                            </div>
                            {stat.started && (
                              <span
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border shrink-0 ${
                                  stat.completed
                                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                                }`}
                              >
                                {stat.completed ? (
                                  <>
                                    <Check className="h-3 w-3" aria-hidden="true" />
                                    <span className="sr-only">{pick("Hoàn thành, điểm cao nhất", "Completed, best score")}</span>
                                    {stat.bestPct}%
                                  </>
                                ) : (
                                  <>
                                    <span className="sr-only">{pick("Đã trả lời", "Answered")}</span>
                                    {stat.answered}/{stat.total || "?"}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
