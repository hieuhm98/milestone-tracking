#!/usr/bin/env python3
"""Fill empty ``meaning_vi`` in ``data/word-bank.db`` from open dictionaries.

Runs after the seed, the bulk import and the English backfill (see "Rebuild
order" in local-docs/project-knowledge.md). It only fills rows whose
Vietnamese meaning is empty and never overwrites one.

SOURCES (token-free, in order of preference)
--------------------------------------------
  1. anhviet109K.txt — the Hồ Ngọc Đức Anh–Việt dictionary, the same file
     import_dictionary.py uses. Its translations are the cleaner of the two.
     An entry is split into its part-of-speech blocks ("* danh từ", "* động từ")
     and the block matching the row's pos_code is used, so "present" as an
     adjective gets "có mặt, hiện tại", not the noun "quà tặng".
  2. Kaikki's extract of the Vietnamese Wiktionary (vi-extract.jsonl.gz,
     CC BY-SA 4.0 — the site credits it). Senses that only point at another
     form ("Quá khứ của kill") are skipped, as are slang, archaic and
     obsolete senses when a plain one exists.

A word is looked up lower-cased, then by its WordNet base form (criteria ->
criterion, via the WordNet copy repair_word_meanings.py caches), then by its
British spelling (clamor -> clamour), hyphenated (headfirst -> head-first) or
accented (cliche -> cliché) form, since the dictionaries file words that way.

Usage:
    python scripts/fill_meaning_vi.py            # fill + VACUUM
    python scripts/fill_meaning_vi.py --dry-run  # report counts, write nothing

Sources are cached under .dev-data/dict-cache/ (git-ignored). Standard library only.
"""

from __future__ import annotations

import argparse
import collections
import gzip
import json
import os
import re
import sqlite3
import sys
import unicodedata
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from import_dictionary import HEADER_TAIL, POS_VI, build_meaning_vi, ensure_source  # noqa: E402
from repair_word_meanings import WordNet, wordnet_dir  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "word-bank.db")
CACHE_DIR = os.path.join(ROOT, ".dev-data", "dict-cache")
WIKTIONARY = "vi-extract.jsonl.gz"
WIKTIONARY_URL = "https://kaikki.org/dictionary/downloads/vi/vi-extract.jsonl.gz"

# Kaikki part of speech -> our pos_code.
KAIKKI_POS = {
    "noun": "n", "verb": "v", "adj": "adj", "adv": "adv", "prep": "prep",
    "conj": "conj", "pron": "pron", "intj": "int", "abbrev": "abbr",
}
SKIP_TAGS = {"form-of", "alt-of", "no-gloss"}
MARKED_TAGS = {"slang", "archaic", "obsolete", "rare", "dated"}
# Senses that only point at another form of the word.
FORM_OF = re.compile(
    r"^(động từ chia|quá khứ|phân từ|số nhiều|dạng|cách viết|so sánh|ngôi thứ)", re.I
)


def vi_pos(star_line: str) -> str | None:
    best = None

    for phrase, code in POS_VI:
        i = star_line.find(phrase)

        if i != -1 and (best is None or i < best[0]):
            best = (i, code)

    return best[1] if best else None


def parse_hnd(path: str) -> dict[str, list[tuple[str | None, list[str]]]]:
    """{lower_word: [(pos_code, [meaning, ...]), ...]} — one item per "*" block."""
    out: dict[str, list] = {}
    blocks = None

    with open(path, encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.rstrip("\n").lstrip("﻿")

            if line.startswith("@"):
                word = re.split(r"\s*/", line[1:], maxsplit=1)[0].strip().lower()
                blocks = [] if word not in out else None  # the first entry wins

                if blocks is not None:
                    out[word] = blocks
            elif blocks is None:
                continue
            elif line.startswith("*"):
                blocks.append((vi_pos(line), []))
            elif line.startswith("-") and line[1:].strip() and not HEADER_TAIL.match(line[1:].strip()):
                if not blocks:
                    blocks.append((None, []))

                blocks[-1][1].append(line[1:].strip())

    return out


def ensure_wiktionary() -> str:
    dest = os.path.join(CACHE_DIR, WIKTIONARY)

    if not os.path.exists(dest):
        os.makedirs(CACHE_DIR, exist_ok=True)
        print(f"  downloading {WIKTIONARY_URL}")
        urllib.request.urlretrieve(WIKTIONARY_URL, dest)

    return dest


def parse_wiktionary(path: str) -> dict[str, list[tuple[str | None, list[str]]]]:
    """{lower_word: [(pos_code, [gloss, ...]), ...]} for English entries."""
    out: dict[str, list] = collections.defaultdict(list)

    with gzip.open(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            entry = json.loads(line)

            if entry.get("lang_code") != "en":
                continue

            plain, marked = [], []

            for sense in entry.get("senses", []):
                tags = set(sense.get("tags", []))

                if tags & SKIP_TAGS:
                    continue

                for gloss in sense.get("glosses", []):
                    gloss = gloss.strip().rstrip(".")

                    if gloss and not FORM_OF.match(gloss):
                        (marked if tags & MARKED_TAGS else plain).append(gloss)

            glosses = plain or marked

            if glosses:
                out[entry["word"].lower()].append((KAIKKI_POS.get(entry.get("pos")), glosses))

    return out


# American ending -> British ending.
UK_ENDINGS = [("or", "our"), ("er", "re"), ("ize", "ise"), ("yze", "yse"), ("og", "ogue"),
              ("eled", "elled"), ("eling", "elling")]


def fold(word: str) -> str:
    """cliché -> cliche"""
    return "".join(c for c in unicodedata.normalize("NFD", word) if unicodedata.category(c) != "Mn")


def variants(word: str, table: dict, folded: dict[str, str]) -> list[str]:
    """Spellings of `word` that `table` files it under."""
    out = [word]
    out += [word[: -len(us)] + uk for us, uk in UK_ENDINGS if word.endswith(us)]
    out += [word[:i] + "-" + word[i:] for i in range(3, len(word) - 2)]

    if word in folded:
        out.append(folded[word])

    return [v for v in out if v in table]


def pick(blocks: list[tuple[str | None, list[str]]], pos: str | None) -> str | None:
    """The meaning for `pos`, else the entry's first block."""
    matching = [m for p, m in blocks if pos and p == pos and m]
    chosen = matching[0] if matching else next((m for _, m in blocks if m), None)

    return build_meaning_vi(chosen) if chosen else None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="report counts, write nothing")
    args = ap.parse_args()

    if not os.path.exists(DB_PATH):
        print(f"✗ {DB_PATH} not found. Seed the word bank first.")
        return 1

    print("Loading sources ...")
    hnd = parse_hnd(ensure_source("anhviet109K.txt"))
    wiktionary = parse_wiktionary(ensure_wiktionary())
    wn = WordNet(wordnet_dir())
    folded = {
        name: {fold(k): k for k in table if fold(k) != k}
        for name, table in (("Hồ Ngọc Đức", hnd), ("Wiktionary", wiktionary))
    }
    print(f"  Hồ Ngọc Đức: {len(hnd):,} words  ·  Wiktionary: {len(wiktionary):,} words")

    db = sqlite3.connect(DB_PATH)
    rows = db.execute(
        "SELECT id, word, pos_code FROM words WHERE meaning_vi IS NULL OR TRIM(meaning_vi) = ''"
    ).fetchall()

    updates, stats, missing = [], collections.Counter(), []

    for row_id, word, pos in rows:
        lookups = list(dict.fromkeys([word.lower(), wn.base(word.lower())]))
        found = None

        for source, table in (("Hồ Ngọc Đức", hnd), ("Wiktionary", wiktionary)):
            keys = [v for k in lookups for v in variants(k, table, folded[source])]

            for key in keys:
                if key in table and (meaning := pick(table[key], pos)):
                    found = (source, meaning)
                    break

            if found:
                break

        if found:
            updates.append((found[1], row_id))
            stats[found[0]] += 1
        else:
            missing.append(word)

    print(f"  empty meaning_vi: {len(rows):,}")

    for source, count in stats.most_common():
        print(f"    filled from {source}: {count:,}")

    print(f"    still empty: {len(missing):,}  e.g. {', '.join(missing[:12])}")

    if args.dry_run:
        db.close()

        return 0

    with db:
        db.executemany("UPDATE words SET meaning_vi = ? WHERE id = ?", updates)

    db.execute("VACUUM")
    db.close()
    print(f"✓ Filled {len(updates):,} rows in {os.path.relpath(DB_PATH, ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
