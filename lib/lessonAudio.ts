import { type Lang } from "./i18n";

/** One narrated article section. */
export interface LessonAudioTrack {
  /** 1-based `## ` section number. */
  section: number;
  src: string;
  seconds: number;
}

/** Response of `GET /api/lesson-audio/<slug>`. */
export type LessonAudioData = Record<Lang, LessonAudioTrack[]>;
