"""Turn lesson Markdown into text a TTS engine can read aloud."""
import re

SYMBOLS = {
    "vi": {"≈": " khoảng ", "≠": " khác ", "≥": " lớn hơn hoặc bằng ", "≤": " nhỏ hơn hoặc bằng ", "⇔": " tương đương ", "−": " trừ "},
    "en": {"≈": " about ", "≠": " is not ", "≥": " at least ", "≤": " at most ", "⇔": " is equivalent to ", "−": " minus "},
}


OPERATORS = {"vi": {"×": " nhân ", "÷": " chia cho "}, "en": {"×": " times ", "÷": " divided by "}}
POWERS = {"vi": " mũ ", "en": " to the power of "}
SCALES = {"vi": {2: "triệu", 3: "tỷ", 4: "nghìn tỷ"}, "en": {2: "million", 3: "billion", 4: "trillion"}}


def _spell_maths(text, lang):
    """Engines drop `÷`, flatten `2¹⁰` and read long round numbers digit by digit."""

    def scale(match):
        groups = len(re.findall(r"[.,]000", match.group(0)))

        return f"{match.group(1)} {SCALES[lang][groups]}"

    text = re.sub(r"\b(\d{1,3})(?:[.,]000){2,4}\b", scale, text)
    text = re.sub(
        r"[⁰¹²³⁴-⁹]+",
        lambda m: POWERS[lang] + m.group(0).translate(str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹", "0123456789")),
        text,
    )

    for symbol, spoken in OPERATORS[lang].items():
        text = text.replace(symbol, spoken)

    return text


def split_sections(markdown):
    """Same split as splitArticle() in lib/lessons.ts: one string per `## ` heading."""
    lines = markdown.split("\n")
    starts = [i for i, line in enumerate(lines) if line.startswith("## ")]

    return [
        "\n".join(lines[start:end])
        for start, end in zip(starts, starts[1:] + [len(lines)])
    ]


def _clean_inline(text, lang):
    text = re.sub(r"<[^>\n]+>(?![`])", "", text) if text.lstrip().startswith("<") else text
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"[*`]|~~", "", text)

    text = _spell_maths(text, lang)

    for symbol, spoken in SYMBOLS[lang].items():
        text = text.replace(symbol, spoken)

    text = re.sub(r"\s*[→↔◄►▶⟶⇒]+\s*", ", ", text)
    text = re.sub(r"\s+[–—]\s*|\s*[–—]\s+", ", ", text)
    # Emoji and pictographs are read out by name or garbled, so drop them.
    text = re.sub(r"[\U0001F000-\U0001FAFF⌀-⏿☀-➿️]", "", text)

    return re.sub(r"\s{2,}", " ", text).strip(" ,")


def _sentence(text):
    if text and text[-1] not in ".!?:;…":
        return text + "."

    return text


def _table_row(cells, header, lang):
    """`HDD. Speed: Slow; Price: Cheap.` — the first cell names the row."""
    first, rest = cells[0], cells[1:]
    parts = [
        f"{name}: {value}" if name else value
        for name, value in zip(header[1:], rest)
        if value
    ]
    row = _sentence(_clean_inline(first, lang))
    detail = _sentence(_clean_inline("; ".join(parts), lang))

    return f"{row} {detail}".strip()


def speakable(section, lang):
    section = re.sub(r"^[ \t>]*(```|~~~).*?^[ \t>]*\1[ \t]*$", "", section, flags=re.M | re.S)
    lines, header = [], None

    for raw in section.split("\n"):
        line = re.sub(r"^(>\s*)+", "", raw.strip())

        if line.startswith("|"):
            cells = [cell.strip() for cell in re.split(r"(?<!\\)\|", line.strip("|"))]

            if all(re.fullmatch(r":?-+:?", cell) for cell in cells):
                continue

            if header is None:
                header = cells
            else:
                lines.append(_table_row(cells, header, lang))

            continue

        header = None

        if not line or re.fullmatch(r"[-*_]{3,}", line):
            continue

        line = re.sub(r"^#{2}\s+\d+\.\s*", "", line)
        line = re.sub(r"^(#+|[-*+]|\[[ xX]\])\s+", "", line)
        cleaned = _sentence(_clean_inline(line, lang))

        if cleaned:
            lines.append(cleaned)

    return "\n".join(lines)
