// Text matching shared by every "filter this list" search box.
//
// Vietnamese titles are typed without diacritics more often than with them, so
// both sides are folded before comparing: "quan ly" finds "Quản lý".

export function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * True when every word of an already-normalized `query` appears in the fields.
 * Word-by-word, so "docker compose" still finds "Compose with Docker".
 */
export function matchesSearch(query: string, ...fields: (string | undefined)[]): boolean {
  if (!query) return true;

  const haystack = normalizeSearch(fields.filter(Boolean).join(" "));

  return query.split(/\s+/).every((word) => haystack.includes(word));
}
