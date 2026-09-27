"""Shared PDF reading for the IELTS Speaking conversion.

The source is a 725-page PDF laid out like a website: a fixed header line, a
fixed footer line, and — stamped down the right margin of every page — the
publisher's watermark, drawn as separate very large characters that interleave
with the body text when the page is read linearly.

Everything here is about turning one page into clean, typed lines:
  * the watermark is dropped by font size (body text never exceeds 19pt),
  * header and footer by their fixed vertical bands,
  * lines are rebuilt from words so highlighted phrases keep their spaces,
    which `extract_text()` loses.
"""

from dataclasses import dataclass, field

# Body text tops out at 19pt (a section title); the watermark runs 42-62pt.
MAX_BODY_SIZE = 20.0
HEADER_BAND = 30.0
FOOTER_BAND = 790.0
# Light yellow fill behind the phrases to learn.
HIGHLIGHT_FILL = (0.988235, 0.905882, 0.65098)
COLOR_TOLERANCE = 0.02
# Two words on the same visual line never differ by more than this.
LINE_TOLERANCE = 3.0


@dataclass
class Word:
    text: str
    x0: float
    x1: float
    top: float
    bottom: float
    size: float
    bold: bool
    highlighted: bool = False
    #: Index of the highlight rectangle this word sits in, or -1.
    highlight_id: int = -1
    #: That rectangle's horizontal span, used to tell touching phrases apart.
    hl_x0: float = 0.0
    hl_x1: float = 0.0

    @property
    def is_ipa(self) -> bool:
        return self.size < 9.5 and self.text.startswith("/")


@dataclass
class Line:
    top: float
    words: list = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join(w.text for w in self.words)

    @property
    def size(self) -> float:
        return max(w.size for w in self.words)

    @property
    def x0(self) -> float:
        return min(w.x0 for w in self.words)

    @property
    def bold(self) -> bool:
        return all(w.bold for w in self.words)

    @property
    def is_ipa(self) -> bool:
        return all(w.is_ipa for w in self.words)


def _close(a, b) -> bool:
    return a is not None and b is not None and len(a) == len(b) and all(abs(x - y) < COLOR_TOLERANCE for x, y in zip(a, b))


def highlight_rects(page) -> list:
    """The yellow bands behind 'phrases to learn', in reading order."""
    rects = [r for r in page.rects if _close(r.get("non_stroking_color"), HIGHLIGHT_FILL)]

    return sorted(rects, key=lambda r: (round(r["top"]), r["x0"]))


def page_words(page) -> list:
    """Body words only: no watermark, no header, no footer."""
    raw = page.extract_words(x_tolerance=1.0, extra_attrs=["size", "fontname"])
    rects = highlight_rects(page)
    words = []

    for w in raw:
        if w["size"] >= MAX_BODY_SIZE:
            continue

        if w["top"] < HEADER_BAND or w["top"] > FOOTER_BAND:
            continue

        word = Word(
            text=w["text"],
            x0=w["x0"],
            x1=w["x1"],
            top=w["top"],
            bottom=w["bottom"],
            size=w["size"],
            bold="Bold" in w["fontname"],
        )
        mid_x = (word.x0 + word.x1) / 2
        mid_y = (word.top + word.bottom) / 2

        # Each "phrase to learn" gets its own rectangle, so remembering which
        # one a word falls in is what keeps two adjacent phrases apart.
        for index, r in enumerate(rects):
            if r["x0"] - 1 <= mid_x <= r["x1"] + 1 and r["top"] - 1 <= mid_y <= r["bottom"] + 1:
                word.highlighted = True
                word.highlight_id = index
                word.hl_x0 = r["x0"]
                word.hl_x1 = r["x1"]

                break
        words.append(word)

    return words


def page_lines(page) -> list:
    """Words grouped into visual lines, top to bottom then left to right."""
    lines = []

    for word in sorted(page_words(page), key=lambda w: (w.top, w.x0)):
        if lines and abs(word.top - lines[-1].top) <= LINE_TOLERANCE:
            lines[-1].words.append(word)
        else:
            lines.append(Line(top=word.top, words=[word]))

    for line in lines:
        line.words.sort(key=lambda w: w.x0)

    return lines
