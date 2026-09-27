"""PDF → JSON for the IELTS Speaking section.

    python scripts/ielts/extract.py              # writes data/ielts-speaking/
    python scripts/ielts/extract.py --pages 28,40  # a slice, for debugging

The source PDF is laid out like a website and every question follows the same
shape, so the parser reads the document as one ordered stream of typed items
(lines and table rows, each with its page and vertical position) and runs a
small state machine over it. Reading a stream rather than page by page is what
makes questions that straddle a page break — including their tables — fall out
correctly.

Run from the project root; the PDF lives outside git in local_cowork/source/.
"""

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pdfplumber

sys.path.insert(0, str(Path(__file__).parent))
from pdf_model import page_lines  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "local_cowork" / "source" / "IELTS_Speaking_Band9_vs_Band6.pdf"
OUT = ROOT / "data" / "ielts-speaking"

# Text the page chrome prints and the web page renders itself.
JUMP_BAR = "Band 6 · Band 9 · Analysis · Vocabulary"
FOOTER_LINKS = "↑ Back to section list"
BANNED = ("Thầy Hà", "Academic English", "Complete Edition")

# Line kinds that can be the continuation of a wrapped "Key difference".
CONTINUATION_KINDS = ("other", "body6", "body9", "section_sub", "section_list", "cue_prompt")

CRITERIA = {
    "Fluency & Coherence": "fluency",
    "Lexical Resource": "lexical",
    "Grammar (Range & Accuracy)": "grammar",
}


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[àáạảãâầấậẩẫăằắặẳẵ]", "a", value)
    value = re.sub(r"[èéẹẻẽêềếệểễ]", "e", value)
    value = re.sub(r"[ìíịỉĩ]", "i", value)
    value = re.sub(r"[òóọỏõôồốộổỗơờớợởỡ]", "o", value)
    value = re.sub(r"[ùúụủũưừứựửữ]", "u", value)
    value = re.sub(r"[ỳýỵỷỹ]", "y", value)
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", "-", value)

    return value.strip("-")[:60]


# --------------------------------------------------------------- item stream


def classify(line) -> str:
    """Name the role a visual line plays, from its size, weight and text."""
    text = line.text.strip()
    size = line.size

    if JUMP_BAR in text or FOOTER_LINKS in text:
        return "chrome"

    if text.startswith(("PART 1 ›", "PART 2 & 3 ›")) and size < 11:
        return "eyebrow"

    if size >= 17:
        return "section_title"

    if text.startswith("Key difference"):
        return "key_difference"

    if text == "VOCABULARY":
        return "vocab_heading"

    if text.startswith("BAND 6 ·"):
        return "band6_label"

    if text.startswith("BAND 9 ·"):
        return "band9_label"

    if text == "CUE CARD":
        return "cue_label"

    if text.startswith("1-MINUTE NOTES"):
        return "notes_label"

    if line.is_ipa:
        return "ipa"

    if size >= 13.8 and line.bold:
        return "unit_title"

    if 13.2 <= size < 13.8 and line.bold:
        return "cue_prompt"

    if 12.8 <= size < 13.2:
        return "body9"

    if 12.2 <= size < 12.8:
        return "body6"

    if 11.2 <= size < 12.0:
        return "section_list" if line.x0 > 64 else "section_sub"

    return "other"


def table_rows(page):
    """Table rows with their vertical position, watermark characters removed."""
    clean = page.filter(lambda o: not (o.get("object_type") == "char" and o.get("size", 0) >= 20))
    out = []

    for table in clean.find_tables():
        rows = table.extract()

        if not rows or max((len(r) for r in rows), default=0) < 3:
            continue

        # A highlight rectangle also looks like a one-cell table; the real
        # analysis and vocabulary tables span the whole text column.
        if table.bbox[2] - table.bbox[0] < 300:
            continue

        for row, cells in zip(table.rows, rows):
            values = [(c or "").replace("\n", " ").strip() for c in cells]

            if not any(values):
                continue

            out.append({"kind": "row", "top": row.bbox[1], "cells": values})

    return out


def merge_wrapped_titles(items: list) -> list:
    """Rejoin a title that wrapped onto a second line.

    A long question or section title is two lines in the PDF but one title; the
    give-away is that nothing else (the jump bar, an answer) comes between them.
    """
    merged = []

    for item in items:
        previous = merged[-1] if merged else None

        if (
            previous is not None
            and item["kind"] in ("unit_title", "section_title")
            and previous["kind"] == item["kind"]
            and item["page"] == previous["page"]
            and 0 < item["top"] - previous["top"] < 30
        ):
            previous["text"] = f'{previous["text"]} {item["text"]}'

            continue

        merged.append(item)

    return merged


def build_stream(pdf, first=0, last=None):
    """Every page's lines and table rows, in reading order."""
    stream = []
    pages = pdf.pages[first : last if last is not None else len(pdf.pages)]

    for offset, page in enumerate(pages):
        number = first + offset + 1
        items = []

        for line in page_lines(page):
            items.append({"kind": classify(line), "top": line.top, "line": line, "text": line.text.strip()})

        items.extend(table_rows(page))
        items.sort(key=lambda i: i["top"])

        for item in items:
            item["page"] = number

        stream.extend(items)

    return merge_wrapped_titles(stream)


# ------------------------------------------------------------------ answers


def attach_ipa(body_lines, ipa_lines):
    """Map each IPA transcription onto the word it sits under."""
    pairs = {}

    for ipa_line in ipa_lines:
        above = [b for b in body_lines if b.top < ipa_line.top]

        if not above:
            continue

        target_line = max(above, key=lambda b: b.top)

        for ipa_word in ipa_line.words:
            best, overlap = None, 0.0

            for word in target_line.words:
                span = min(word.x1, ipa_word.x1) - max(word.x0, ipa_word.x0)

                if span > overlap:
                    best, overlap = word, span

            if best is not None:
                pairs[id(best)] = ipa_word.text

    return pairs


def build_segments(body_lines, ipa_lines):
    """Answer text as plain runs, highlighted phrases and IPA-carrying words."""
    ipa_by_word = attach_ipa(body_lines, ipa_lines)
    segments = []
    buffer = []
    phrase = []
    phrase_ipa = []
    phrase_index = 0
    last_rect_x1 = -999.0
    last_top = -999.0
    right_edge = max((w.x1 for line in body_lines for w in line.words), default=0)

    def flush_text():
        if buffer:
            segments.append({"t": "text", "v": " ".join(buffer)})
            buffer.clear()

    def flush_phrase():
        nonlocal phrase_index

        if phrase:
            # The rectangle usually covers the punctuation that follows a
            # phrase. Keep it out of the term but put it back into the
            # sentence, or the answer loses its full stops.
            joined = re.sub(r"\s+([,.;:!?])", r"\1", " ".join(phrase))
            value = joined.strip(" ,.;:!?")
            trailing = joined[len(joined.rstrip(" ,.;:!?")) :]
            segment = {"t": "phrase", "v": value, "vocabIndex": phrase_index}

            # A hard word often sits inside a highlighted phrase; its IPA has to
            # travel with the phrase or it is lost (a third of them are).
            if phrase_ipa:
                segment["ipa"] = list(phrase_ipa)

            segments.append(segment)

            if trailing.strip():
                segments.append({"t": "text", "v": trailing.strip()})

            phrase_index += 1
            phrase.clear()
            phrase_ipa.clear()

    for line in body_lines:
        for word in line.words:
            if word.highlighted:
                # One phrase is drawn as a run of touching rectangles, one per
                # word, so a gap between rectangles — not a change of rectangle
                # — is where the next phrase starts. A phrase that wraps
                # resumes at the left edge of the next line, which reads as a
                # gap and has to be allowed through.
                gap = word.hl_x0 - last_rect_x1
                wrapped = word.x0 < right_edge - 200 and word.top > last_top + 5

                if phrase and gap > 2 and not wrapped:
                    flush_phrase()

                flush_text()
                phrase.append(word.text)

                if ipa_by_word.get(id(word)):
                    phrase_ipa.append({"word": word.text, "ipa": ipa_by_word[id(word)]})

                last_rect_x1 = word.hl_x1
                last_top = word.top

                continue

            flush_phrase()
            ipa = ipa_by_word.get(id(word))

            if ipa:
                flush_text()
                segments.append({"t": "ipa", "v": word.text, "ipa": ipa})
            else:
                buffer.append(word.text)

    flush_phrase()
    flush_text()

    return with_spacing(segments)


def _tokens(value: str) -> list:
    return [t for t in re.split(r"[^a-z0-9'-]+", value.lower()) if t]


def _stem(token: str) -> str:
    return token[:4]


def split_merged_phrases(segments: list, rows: list, expected: int) -> None:
    """Cut a highlight that ran two terms together, e.g. "took forever to boot up".

    The source highlights adjacent phrases as one unbroken band, so geometry
    cannot separate them — but the vocabulary table lists them in order, and
    the second term's first word is inside the run.
    """
    starts = []

    for row in rows:
        for alternative in row["term"].split("/"):
            first = _tokens(alternative)

            if first:
                starts.append(_stem(first[0]))

    for index, segment in enumerate(list(segments)):
        if segment["t"] != "phrase" or sum(1 for s in segments if s["t"] == "phrase") >= expected:
            continue

        words = segment["v"].split()

        for position in range(1, len(words)):
            if _stem(_tokens(words[position])[0] if _tokens(words[position]) else "") in starts:
                head = " ".join(words[:position]).strip(" ,.;:!?")
                tail = " ".join(words[position:]).strip(" ,.;:!?")

                if head and tail:
                    at = segments.index(segment)
                    segments[at : at + 1] = [
                        {"t": "phrase", "v": head, "vocabIndex": 0},
                        {"t": "phrase", "v": tail, "vocabIndex": 0},
                    ]

                break


def map_phrases_to_rows(segments: list, rows: list) -> None:
    """Point each highlighted phrase at the vocabulary row that explains it.

    Usually one row per phrase in order, but a row like "in theory / in
    practice" covers two separate highlights, so matching is by wording with a
    positional fallback rather than a straight zip.
    """
    phrases = [s for s in segments if s["t"] == "phrase"]
    cursor = 0

    for phrase in phrases:
        tokens = {_stem(t) for t in _tokens(phrase["v"])}
        best, best_score = None, 0

        for index, row in enumerate(rows):
            for alternative in row["term"].split("/"):
                alt_tokens = {_stem(t) for t in _tokens(alternative)}

                if not alt_tokens:
                    continue

                score = len(tokens & alt_tokens) / len(alt_tokens)

                if score > best_score:
                    best, best_score = index, score

        if best is not None and best_score >= 0.5:
            phrase["vocabIndex"] = best
            cursor = max(cursor, best + 1)
        else:
            phrase["vocabIndex"] = min(cursor, len(rows) - 1) if rows else -1
            cursor += 1


#: Punctuation that hugs the word before it, so no space is inserted in front.
CLOSING = ",.;:!?)]”’%…"
#: Characters after which a space would be wrong.
OPENING = "([“‘"


def with_spacing(segments: list) -> list:
    """Put the inter-word spaces back at segment boundaries.

    Segments are rendered by simple concatenation, so the space between "for"
    and a highlighted phrase has to live in the data — otherwise the answer
    reads "writingessays,making slides".
    """
    spaced = []

    for segment in segments:
        if spaced:
            previous = spaced[-1]
            first = segment["v"][:1]
            last = previous["v"][-1:]

            if first and last and first not in CLOSING and last not in OPENING and last != " ":
                if previous["t"] == "text":
                    previous["v"] += " "
                elif segment["t"] == "text":
                    segment["v"] = f' {segment["v"]}'
                else:
                    spaced.append({"t": "text", "v": " "})

        spaced.append(segment)

    return spaced


def parse_count(label: str, word: str) -> int:
    match = re.search(rf"(\d+)\s+{word}", label)

    return int(match.group(1)) if match else 0


# ------------------------------------------------------------- state machine


def group_of(eyebrow: str) -> str:
    """"PART 1 › TOPICS 1–10" → "Topics 1–10", the label used in the contents."""
    tail = eyebrow.split("›")[-1].strip()

    return tail.title().replace("Part 2 & 3", "Part 2 & 3") if tail else ""


def build_notes(lines: list) -> list:
    """Turn the 1-MINUTE NOTES block into one note per column.

    The first bold line holds the labels; every later word belongs to the
    column whose label starts at or before it.
    """
    if not lines:
        return []

    header, *body = lines
    columns = []

    for word in header.words:
        if columns and word.x0 - columns[-1]["x1"] < 12:
            columns[-1]["label"].append(word.text)
            columns[-1]["x1"] = word.x1
        else:
            columns.append({"x0": word.x0, "x1": word.x1, "label": [word.text], "text": []})

    for line in body:
        for word in line.words:
            target = None

            for column in columns:
                if word.x0 >= column["x0"] - 2:
                    target = column

            if target is not None:
                target["text"].append(word.text)

    return [
        {"label": " ".join(c["label"]), "text": " ".join(c["text"])}
        for c in columns
        if c["label"] and c["text"]
    ]


class Unit:
    """One question being assembled from the stream."""

    def __init__(self, title: str, page: int):
        self.title = title
        self.page = page
        self.band6_label = ""
        self.band9_label = ""
        self.band6_lines = []
        self.band9_lines = []
        self.ipa_lines = []
        self.rows = []
        self.key_difference = ""
        self.key_open = False
        self.phase = "start"

    def finish(self, kind: str, number: int, ident: str, question: str, problems: list):
        analysis = {"fluency": None, "lexical": None, "grammar": None}
        vocabulary = []

        for cells in self.rows:
            head = cells[0].strip()

            if head in CRITERIA and len(cells) >= 3:
                analysis[CRITERIA[head]] = {"band6": cells[1].strip(), "band9": cells[2].strip()}
            elif len(cells) >= 4 and head not in ("Term", "Band 6 vs Band 9"):
                vocabulary.append(
                    {
                        "term": cells[0].strip(),
                        "definition": cells[1].strip(),
                        "example": cells[2].strip(),
                        "vietnamese": cells[3].strip(),
                    }
                )

        note = None
        key = self.key_difference

        # A few cards prepend "Note: this card's Part 3 questions repeat Card N."
        if key.startswith("Note:"):
            split = re.split(r"(?<=\.)\s+(?=[A-Z])", key, maxsplit=1)
            note = split[0].strip()
            key = split[1].strip() if len(split) > 1 else ""

        for name, value in analysis.items():
            if value is None:
                problems.append(f"{ident}: missing analysis row '{name}'")
                analysis[name] = {"band6": "", "band9": ""}

        if not vocabulary:
            problems.append(f"{ident}: no vocabulary rows")

        if not key:
            problems.append(f"{ident}: no key difference")

        expected = parse_count(self.band9_label, "phrases")
        segments = build_segments(self.band9_lines, self.ipa_lines)

        split_merged_phrases(segments, vocabulary, expected)
        map_phrases_to_rows(segments, vocabulary)

        band9 = {
            "words": parse_count(self.band9_label, "words"),
            "phrases": expected,
            "segments": segments,
        }
        highlights = sum(1 for s in segments if s["t"] == "phrase")

        # The printed "N phrases to learn" is the source of truth: one
        # vocabulary row sometimes covers two highlights ("in theory / in
        # practice"), so rows and highlights legitimately differ.
        if highlights != expected:
            problems.append(f"{ident}: {highlights} highlighted phrases, header says {expected}")

        return {
            "id": ident,
            "kind": kind,
            "number": number,
            "question": question,
            "band6": {
                "words": parse_count(self.band6_label, "words"),
                "segments": build_segments(self.band6_lines, []),
            },
            "band9": band9,
            "analysis": {**analysis, "keyDifference": key, **({"note": note} if note else {})},
            "vocabulary": vocabulary,
        }


def parse(stream, problems):
    """Walk the stream into Part 1 topics and Part 2 & 3 cards."""
    topics, cards = [], []
    section = None      # the topic or card being filled
    unit = None         # the question being filled
    pending_cue = None  # cue-card box of the current card
    seen_titles = 0

    def close_unit():
        nonlocal unit

        if unit is None:
            return

        title = unit.title
        part3 = re.match(r"^Part 3 · (\d+)\s+(.*)$", title)
        part1 = re.match(r"^(\d+)\.\s+(.*)$", title)

        if section is None:
            problems.append(f"orphan question before any section: {title[:60]}")
            unit = None

            return

        if part1 and section["type"] == "topic":
            number = int(part1.group(1))
            built = unit.finish("part1", number, f"p1-q{number}", part1.group(2), problems)
            section["questions"].append(built)
        elif part3 and section["type"] == "card":
            number = int(part3.group(1))
            built = unit.finish("part3", number, f"c{section['number']}-p3-{number}", part3.group(2), problems)
            section["part3"].append(built)
        elif section["type"] == "card":
            built = unit.finish("part2", 0, f"c{section['number']}-part2", section["prompt"], problems)
            section["part2"] = built
        else:
            problems.append(f"unplaceable question: {title[:60]}")

        unit = None

    def close_section():
        close_unit()

        if section is None:
            return

        (topics if section["type"] == "topic" else cards).append(section)

    for index, item in enumerate(stream):
        kind = item["kind"]
        text = item.get("text", "")

        # A section always opens with its eyebrow ("PART 1 › TOPICS 1–10");
        # large type anywhere else is a contents heading, not a new section.
        if kind == "section_title" and index > 0 and stream[index - 1]["kind"] == "eyebrow":
            eyebrow = stream[index - 1].get("text", "")
            close_section()
            card = re.match(r"^Part 2 · Card (\d+) — (.*)$", text)

            if card:
                section = {
                    "type": "card",
                    "number": int(card.group(1)),
                    "title": card.group(2).strip(),
                    "slug": f"card-{card.group(1)}",
                    "group": group_of(eyebrow),
                    "titleVi": None,
                    "prompt": "",
                    "bullets": [],
                    "notes": [],
                    "part2": None,
                    "part3": [],
                    "page": item["page"],
                }
            else:
                label, _, title = text.partition(" — ")
                section = {
                    "type": "topic",
                    "label": label.strip(),
                    "title": title.strip() or label.strip(),
                    "slug": slugify(title or label),
                    "group": group_of(eyebrow),
                    "titleVi": None,
                    "note": None,
                    "questions": [],
                    "page": item["page"],
                }

            unit = None
            pending_cue = None

            continue

        if section is None:
            continue

        # The eyebrow repeats on every page of a section; the group was already
        # taken from the one that opened it.
        if kind == "eyebrow":
            continue

        if kind == "section_sub" and section["titleVi"] is None and unit is None:
            section["titleVi"] = text

            continue

        if kind == "unit_title":
            close_unit()
            seen_titles += 1

            # The Part 2 long-turn banner opens the cue card rather than a question.
            if text.startswith("Part 2 · Long turn"):
                pending_cue = {"phase": "await_prompt"}

                continue

            unit = Unit(text, item["page"])

            continue

        if pending_cue is not None and section["type"] == "card" and unit is None:
            if kind == "cue_prompt":
                section["prompt"] = text

                continue

            if kind == "body6":
                if text.startswith("•"):
                    section["bullets"].append(text.lstrip("• ").strip())
                elif text.startswith("You should say"):
                    pass

                continue

            if kind == "row" and pending_cue.get("notes_open"):
                cells = [c for c in item["cells"] if c]

                if cells:
                    pending_cue.setdefault("rows", []).append(item["cells"])

                continue

            if kind == "notes_label":
                pending_cue["notes_open"] = True
                pending_cue["notes_lines"] = []

                continue

            # The notes are a row of sticky notes: one bold line of labels, then
            # the note text underneath, each column left-aligned under its label.
            if pending_cue.get("notes_open") and kind in ("other", "section_sub", "body6"):
                pending_cue["notes_lines"].append(item["line"])

                continue

        if kind == "band6_label":
            if pending_cue and pending_cue.get("notes_lines"):
                section["notes"] = build_notes(pending_cue.pop("notes_lines"))
                pending_cue["notes_open"] = False

            # The cue card's answers belong to the Part 2 unit.
            if unit is None:
                unit = Unit(section.get("prompt", "Part 2"), item["page"])

            unit.band6_label = text
            unit.phase = "band6"

            continue

        if unit is None:
            continue

        if kind == "band9_label":
            unit.band9_label = text
            unit.phase = "band9"

            continue

        if kind == "key_difference":
            unit.key_difference = text.split(":", 1)[1].strip() if ":" in text else text
            unit.key_open = True

            continue

        # "Key difference" is one sentence and it usually wraps, so the lines
        # after it belong to it until the vocabulary table (or anything else
        # structural) begins. This has to be checked before the answer
        # branches, which would otherwise swallow the continuation.
        if unit.key_open:
            if kind in CONTINUATION_KINDS and item.get("line") is not None:
                unit.key_difference = f"{unit.key_difference} {text}".strip()

                continue

            unit.key_open = False

        if kind == "body6" and unit.phase == "band6":
            unit.band6_lines.append(item["line"])
        elif kind in ("body9", "body6") and unit.phase == "band9":
            unit.band9_lines.append(item["line"])
        elif kind == "ipa" and unit.phase == "band9":
            unit.ipa_lines.append(item["line"])
        elif kind == "row":
            unit.rows.append(item["cells"])

    close_section()

    # The cue-card notes table is collected on the card, not on a question.
    for card in cards:
        rows = card.pop("noteRows", None)

        if rows:
            card["notes"] = rows

    return topics, cards


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", help="first,last (1-based, inclusive) for debugging")
    parser.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    args = parser.parse_args()

    first, last = 0, None

    if args.pages:
        start, end = args.pages.split(",")
        first, last = int(start) - 1, int(end)

    problems = []

    with pdfplumber.open(PDF) as pdf:
        stream = build_stream(pdf, first, last)

    topics, cards = parse(stream, problems)

    part1_count = sum(len(t["questions"]) for t in topics)
    part3_count = sum(len(c["part3"]) for c in cards)
    phrases = sum(
        len(q["vocabulary"])
        for t in topics
        for q in t["questions"]
    ) + sum(len(c["part2"]["vocabulary"]) if c["part2"] else 0 for c in cards) + sum(
        len(q["vocabulary"]) for c in cards for q in c["part3"]
    )

    print(f"topics            {len(topics)}")
    print(f"part 1 questions  {part1_count}")
    print(f"cards             {len(cards)}")
    print(f"part 3 questions  {part3_count}")
    print(f"vocabulary rows   {phrases}")
    print(f"problems          {len(problems)}")

    for line in problems[:25]:
        print("  -", line)

    blob = json.dumps({"topics": topics, "cards": cards}, ensure_ascii=False)

    for banned in BANNED:
        if banned in blob:
            print(f"!! banned string present: {banned}")

    if args.dry_run:
        return

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "part1").mkdir(exist_ok=True)
    (OUT / "part23").mkdir(exist_ok=True)

    # The source prints this caveat under the Study frame's header, where it
    # reads as page furniture rather than as part of a question.
    for topic in topics:
        if topic["label"] == "Compulsory Frame 2":
            topic["note"] = (
                "Part 1 “Work”: the Work questions are for candidates who have a job; "
                "as a high-school student, you answer the Study branch."
            )

    for topic in topics:
        topic.pop("type", None)
        topic.pop("page", None)
        numbers = [q["number"] for q in topic["questions"]] or [0]
        topic["range"] = [min(numbers), max(numbers)]
        (OUT / "part1" / f"{topic['slug']}.json").write_text(
            json.dumps(topic, ensure_ascii=False, indent=1), encoding="utf-8"
        )

    for card in cards:
        card.pop("type", None)
        card.pop("page", None)
        (OUT / "part23" / f"card-{card['number']}.json").write_text(
            json.dumps(card, ensure_ascii=False, indent=1), encoding="utf-8"
        )

    toc = {
        "part1": [
            {
                "slug": t["slug"],
                "group": t["group"],
                "label": t["label"],
                "title": t["title"],
                "titleVi": t["titleVi"],
                "questions": [{"id": q["id"], "label": f"{q['number']}. {q['question']}"} for q in t["questions"]],
            }
            for t in topics
        ],
        "part23": [
            {
                "slug": c["slug"],
                "group": c["group"],
                "label": f"Card {c['number']}",
                "title": c["title"],
                "titleVi": c["titleVi"],
                "questions": ([{"id": f"c{c['number']}-part2", "label": f"Part 2 · {c['prompt']}"}] if c["part2"] else [])
                + [{"id": q["id"], "label": f"Part 3 · {q['number']} {q['question']}"} for q in c["part3"]],
            }
            for c in cards
        ],
        "stats": {"part1": part1_count, "cards": len(cards), "part3": part3_count, "phrases": phrases},
    }
    (OUT / "toc.json").write_text(json.dumps(toc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"written to {OUT}")


if __name__ == "__main__":
    main()
