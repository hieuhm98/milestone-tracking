// The site has two halves: the IT curriculum (everything that existed before)
// and English learning. The sidebar switches between them, and each half owns
// its own nav — a learner working through AWS shouldn't have to scroll past
// dictionary links, and vice versa.

export type SectionId = "it" | "english";

export interface Section {
  id: SectionId;
  /** Where the switcher lands. */
  home: string;
  /** i18n key for the tab label. */
  label: string;
  icon: string;
}

export const SECTIONS: Section[] = [
  { id: "it", home: "/dashboard", label: "section.it", icon: "◈" },
  { id: "english", home: "/english", label: "section.english", icon: "Ⓐ" },
];

/** Which half a route belongs to. Everything outside /english is IT. */
export function sectionForPath(pathname: string): SectionId {
  return pathname === "/english" || pathname.startsWith("/english/") ? "english" : "it";
}
