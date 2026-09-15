// Courses: the study path presented as one course per curriculum track.
//
// A course is a `Group` from lib/groups.ts plus the mini-lesson topics that
// belong to it. Nothing here is stored — every number is derived from the
// lesson catalogue and the learner's progress, so adding a topic to a track
// updates its course card automatically.

import { GROUPS, DEFAULT_GROUP, type Group } from "./groups";
import { lessonKey, resumeLesson, type Lesson, type LessonTopic } from "./lessons";
import { type ProgressData } from "./progress";

/** Midpoint of the 5–10 minute mini-lesson format, used for the time estimate. */
export const MINUTES_PER_LESSON = 7.5;

export type CourseStatus = "not-started" | "in-progress" | "completed";

export interface CourseSummary {
  group: Group;
  /** Topics in curriculum order. */
  topics: LessonTopic[];
  lessonCount: number;
  doneCount: number;
  /** 0–100, rounded down so a course never shows 100% with a lesson left. */
  pct: number;
  status: CourseStatus;
  /** Topics with every mini-lesson completed. */
  topicsDone: number;
  estimatedHours: number;
  /** ISO timestamp of the latest activity in the course, or null if untouched. */
  lastActive: string | null;
  /** Where "Start"/"Continue" should go; null once everything is done. */
  resume: { topic: LessonTopic; lesson: Lesson } | null;
}

/** The track a topic belongs to, with the same fallback the rest of the app uses. */
export function topicGroup(topic: LessonTopic): string {
  return topic.group ?? DEFAULT_GROUP;
}

/** Topics of one course, in curriculum order. */
export function courseTopics(topics: LessonTopic[], groupId: string): LessonTopic[] {
  return topics
    .filter((topic) => topicGroup(topic) === groupId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function summarizeCourse(group: Group, topics: LessonTopic[], progress: ProgressData): CourseSummary {
  const own = courseTopics(topics, group.id);
  let lessonCount = 0;
  let doneCount = 0;
  let topicsDone = 0;
  let lastActive: string | null = null;

  for (const topic of own) {
    let doneHere = 0;

    for (const lesson of topic.lessons) {
      const state = progress.lessons[lessonKey(topic.slug, lesson.id)];

      lessonCount += 1;

      if (state?.completed) doneHere += 1;

      if (state && (lastActive === null || state.updatedAt > lastActive)) lastActive = state.updatedAt;
    }

    doneCount += doneHere;

    if (topic.lessons.length > 0 && doneHere === topic.lessons.length) topicsDone += 1;
  }

  // Rounded down so 149/150 never reads 100%, but floored at 1% once anything is
  // done — "0% complete" next to "1/137" reads as broken.
  const rawPct = lessonCount > 0 ? Math.floor((doneCount / lessonCount) * 100) : 0;
  const pct = doneCount > 0 ? Math.max(1, rawPct) : 0;
  const status: CourseStatus =
    lessonCount > 0 && doneCount === lessonCount ? "completed" : lastActive !== null ? "in-progress" : "not-started";

  return {
    group,
    topics: own,
    lessonCount,
    doneCount,
    pct,
    status,
    topicsDone,
    estimatedHours: Math.max(1, Math.round((lessonCount * MINUTES_PER_LESSON) / 60)),
    lastActive,
    // Scoped to this course, so "Continue" never jumps into another track.
    resume: resumeLesson(own, progress),
  };
}

/** Every track that has at least one mini-lesson topic, in track order. */
export function summarizeCourses(topics: LessonTopic[], progress: ProgressData): CourseSummary[] {
  return GROUPS.slice()
    .sort((a, b) => a.order - b.order)
    .map((group) => summarizeCourse(group, topics, progress))
    .filter((course) => course.lessonCount > 0);
}

/**
 * Catalogue order: courses under way first (most recently studied first), then
 * untouched ones, then finished ones — each group in track order.
 */
export function catalogueOrder(courses: CourseSummary[]): CourseSummary[] {
  const weight: Record<CourseStatus, number> = { "in-progress": 0, "not-started": 1, completed: 2 };

  return courses
    .map((course, index) => ({ course, index }))
    .sort((a, b) => {
      if (a.course.status !== b.course.status) return weight[a.course.status] - weight[b.course.status];

      if (a.course.status === "in-progress") {
        const byRecency = (b.course.lastActive ?? "").localeCompare(a.course.lastActive ?? "");

        if (byRecency !== 0) return byRecency;
      }

      return a.index - b.index;
    })
    .map(({ course }) => course);
}

/** Courses the learner has started but not finished, most recently studied first. */
export function coursesInProgress(courses: CourseSummary[]): CourseSummary[] {
  return courses
    .filter((course) => course.status === "in-progress")
    .sort((a, b) => (b.lastActive ?? "").localeCompare(a.lastActive ?? ""));
}
