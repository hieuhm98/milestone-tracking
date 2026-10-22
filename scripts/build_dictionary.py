#!/usr/bin/env python3
"""Build the dictionary behind /english/dictionary: ``data/dictionary/<letter>.db``.

``data/word-bank.db`` stays the SQL playground's ~24k common words. The
dictionary is far bigger, and lives in its own files, split by first letter
(a.db … z.db, other.db). Each file holds, for its words:

  words     one row per entry — the summary the word list shows: IPA, part of
            speech, a short Vietnamese and English meaning, and how common it is
  senses    every meaning, Vietnamese and English, grouped by part of speech
  examples  example phrases under a sense, with their translation

WHAT IS IN IT
-------------
  * every word-bank word, keeping the bank's curated summary;
  * every other single word of the Hồ Ngọc Đức Anh–Việt dictionary that has a
    Vietnamese meaning and is a real word (in the dwyl list, or a hyphenated
    compound whose parts are: lip-service, shut-down);
  * English words only Vietnamese Wiktionary has (same rules as the importer);
  * phrasal verbs and idioms ("give up", "look after", "piece of cake") as
    entries of their own — Hồ Ngọc Đức lists them inside the main word's entry
    ("!to give up"), where search could not find them.

HOW COMMON (``level``)
----------------------
``freq_rank`` is the word's rank in hermitdave/FrequencyWords (subtitle
counts, 1.6M forms): common < 10,000 ≤ uncommon < 50,000 ≤ rare (or unranked).
A phrase takes the level of its rarest word — there is no phrase frequency
list, and "made of common words" is the useful signal for a learner.

SENSES
------
  * Vietnamese — the whole Hồ Ngọc Đức entry: a group per part of speech, each
    sense with up to three translated examples, and the entry's idioms;
    Wiktionary glosses where it has no entry.
  * English — every WordNet 3.0 sense (multi-word lemmas too, so "give up" gets
    its 12), the most-used part of speech first, up to two example phrases.

Summaries for words outside the bank: IPA from Hồ Ngọc Đức, else CMUdict;
English from WordNet's most-used sense in the word's part of speech, else
wordset-dictionary.

DETERMINISM
-----------
Ids restart at 1 in every shard, so a shard's bytes depend only on its own
words: rebuilding leaves untouched letters byte-identical and git stores
nothing new for them. Shards that no longer have words are deleted.

The browser never downloads these files: the server reads the word list into
memory once and opens one shard per entry lookup.

Usage:
    python scripts/build_dictionary.py

Run it last, after the word-bank chain (see "Rebuild order" in
local-docs/project-knowledge.md). Sources are cached under .dev-data/dict-cache/
(git-ignored). Standard library only.
"""

from __future__ import annotations

import collections
import glob
import json
import os
import re
import sqlite3
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backfill_meaning_en import choose_def, load_wordset, wordnet_def  # noqa: E402
from fill_ipa import load_cmu, lookup as cmu_lookup, to_ipa  # noqa: E402
from fill_meaning_vi import ensure_wiktionary, parse_hnd, parse_wiktionary, pick, vi_pos  # noqa: E402
from import_dictionary import (  # noqa: E402
    CLEAN_WORD,
    HEADER_TAIL,
    build_meaning_vi,
    ensure_source,
    load_lower_set,
    parse_anhviet,
)
from repair_word_meanings import WN_POS, WordNet, wordnet_dir  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "data", "word-bank.db")
OUT_DIR = os.path.join(ROOT, "data", "dictionary")
CACHE_DIR = os.path.join(ROOT, ".dev-data", "dict-cache")
WORDS_TXT = os.path.join(ROOT, "local-docs", "words.txt")
VOCAB_GLOB = os.path.join(ROOT, "knowledge-content", "*", "vocab.json")
FREQ_FILE = os.path.join(CACHE_DIR, "en_full.txt")
FREQ_URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_full.txt"

MAX_VI_EXAMPLES = 3
MAX_EN_EXAMPLES = 2
MAX_IDIOMS = 40  # per headword; "have", "take" and "go" carry hundreds
COMMON, UNCOMMON = 10_000, 50_000  # frequency-rank bounds of the levels

# A phrase key: 2–8 words of letters, apostrophes and hyphens ("one's", "well-to-do").
PHRASE = re.compile(r"^[a-z][a-z'-]*(?: [a-z][a-z'-]*){1,7}$")
POINTER = re.compile(r"^(xem|tên|họ|một tên)\b", re.I)  # "Xem …" / "Tên họ" glosses

SCHEMA = """
CREATE TABLE words (
  id         INTEGER PRIMARY KEY,
  word       TEXT NOT NULL UNIQUE,   -- lower-case lookup key
  display    TEXT NOT NULL,          -- as the source writes it ("London", "give up")
  kind       TEXT NOT NULL CHECK (kind IN ('word', 'phrase')),
  pos_code   TEXT,
  ipa        TEXT,
  meaning_vi TEXT,
  meaning_en TEXT,
  freq_rank  INTEGER,                -- NULL = not in the frequency list
  level      TEXT NOT NULL CHECK (level IN ('common', 'uncommon', 'rare'))
);
CREATE TABLE senses (
  id       INTEGER PRIMARY KEY,
  word_id  INTEGER NOT NULL REFERENCES words(id),
  lang     TEXT NOT NULL CHECK (lang IN ('vi', 'en')),
  pos_code TEXT,
  position INTEGER NOT NULL,
  phrase   TEXT,                     -- the idiom, for rows in the 'idiom' group
  meaning  TEXT NOT NULL
);
CREATE TABLE examples (
  sense_id    INTEGER NOT NULL REFERENCES senses(id),
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL,
  translation TEXT,
  PRIMARY KEY (sense_id, position)
) WITHOUT ROWID;
CREATE INDEX idx_senses_word ON senses(word_id, position);
"""


def shard_of(word: str) -> str:
    """'a'..'z' by first letter, 'other' for words starting with a digit or symbol.

    Mirrors shardOf() in lib/server/wordSenses.ts — keep the two in step.
    """
    first = word[:1]

    return first if "a" <= first <= "z" else "other"


def level_of(rank: int | None) -> str:
    if rank is not None and rank < COMMON:
        return "common"

    if rank is not None and rank < UNCOMMON:
        return "uncommon"

    return "rare"


def load_ranks() -> dict[str, int]:
    if not os.path.exists(FREQ_FILE):
        os.makedirs(CACHE_DIR, exist_ok=True)
        print(f"  downloading {FREQ_URL}")
        urllib.request.urlretrieve(FREQ_URL, FREQ_FILE)

    ranks: dict[str, int] = {}

    with open(FREQ_FILE, encoding="utf-8", errors="replace") as fh:
        for i, line in enumerate(fh):
            word = line.split(" ", 1)[0].strip().lower()

            if word:
                ranks.setdefault(word, i + 1)

    return ranks


def course_words() -> set[str]:
    out = set()

    for path in glob.glob(VOCAB_GLOB):
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)

        for item in data.get("items", []) if isinstance(data, dict) else data:
            if isinstance(item, dict) and item.get("word"):
                out.add(item["word"].strip().lower())

    return out


# --- Hồ Ngọc Đức: full entries and idioms ----------------------------------------


def new_sense(meaning: str, phrase: str | None = None) -> dict:
    return {"meaning": meaning, "phrase": phrase, "examples": []}


def idiom_key(raw: str) -> tuple[str, str] | None:
    """'!to grease (cross) someone's palm' -> ("grease someone's palm", same).

    First of several forms (';'), parenthesised alternatives dropped, leading
    "to " and trailing punctuation stripped. None when it is not a clean phrase.
    """
    text = raw.split(";")[0]
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"\s+", " ", text).strip().rstrip(".?!,:…").strip()
    text = re.sub(r"^to ", "", text, flags=re.I)
    key = text.lower()

    return (key, text) if PHRASE.match(key) else None


def parse_hnd_full(path: str):
    """Whole Hồ Ngọc Đức entries plus every idiom.

    Returns (entries, idioms):
      entries  {word: [(pos_code | 'idiom', [sense, ...]), ...]}  (first entry wins)
      idioms   {phrase_key: (display, [sense, ...])}              (first one wins)
    An idiom's "-" lines are its senses and "=" lines their examples.
    """
    entries: dict[str, list] = {}
    idioms: dict[str, tuple[str, list]] = {}
    groups = None  # this entry's groups, None while skipping a repeated entry
    own_idioms: list[dict] = []
    sense = None
    idiom_senses = None  # senses of the idiom being read, None outside one
    idiom_line = None

    def close_entry() -> None:
        if groups is not None and own_idioms:
            groups.append(("idiom", own_idioms[:MAX_IDIOMS]))

    with open(path, encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = raw.rstrip("\n").lstrip("﻿").strip()

            if not line:
                continue

            body = line[1:].strip()

            if line.startswith("@"):
                close_entry()
                word = body.split("/", 1)[0].strip().lower()
                groups = [] if word not in entries else None
                own_idioms, sense, idiom_senses, idiom_line = [], None, None, None

                if groups is not None:
                    entries[word] = groups

                continue

            if line.startswith("*"):
                if groups is not None:
                    groups.append((vi_pos(line), []))

                sense, idiom_senses = None, None
            elif line.startswith("!"):
                idiom_line = body
                parsed = idiom_key(body)
                idiom_senses = None

                if parsed and parsed[0] not in idioms:
                    idiom_senses = []
                    idioms[parsed[0]] = (parsed[1], idiom_senses)

                sense = None
            elif line.startswith("-") and body and not HEADER_TAIL.match(body):
                if idiom_line is not None:
                    sense = new_sense(body)

                    if idiom_senses is not None:
                        idiom_senses.append(sense)

                    if groups is not None:
                        # The headword's own idiom list keeps one row per idiom.
                        if own_idioms and own_idioms[-1]["phrase"] == idiom_line:
                            own_idioms[-1]["meaning"] += f"; {body}"
                        else:
                            own_idioms.append(new_sense(body, phrase=idiom_line))

                    continue

                if groups is None:
                    continue

                if not groups:
                    groups.append((None, []))

                sense = new_sense(body)
                groups[-1][1].append(sense)
            elif line.startswith("=") and "+" in body and sense is not None:
                text, _, translation = body.partition("+")

                if len(sense["examples"]) < MAX_VI_EXAMPLES:
                    sense["examples"].append((text.strip(), translation.strip() or None))

            # A new sense block ends the idiom; "*" handled above.
            if line.startswith("*"):
                idiom_line = None

        close_entry()

    for word, gs in entries.items():
        entries[word] = [(pos, [s for s in senses if s["meaning"]]) for pos, senses in gs]
        entries[word] = [(pos, senses) for pos, senses in entries[word] if senses]

    idioms = {k: v for k, v in idioms.items() if v[1]}

    return entries, idioms


# --- WordNet -----------------------------------------------------------------------


def wordnet_groups(wn: WordNet, word: str) -> list[tuple[str, list[dict]]]:
    """Every WordNet sense of `word`, grouped by part of speech, most used group first."""
    by_pos: dict[str, list[tuple[int, dict]]] = collections.defaultdict(list)
    usage: collections.Counter = collections.Counter()

    for neg_count, number, _, key in wn.senses.get(wn.base(word), []):
        if key not in wn.synsets:
            continue

        ss_type, _, gloss, _ = wn.synsets[key]
        pos = WN_POS[ss_type]
        definition = gloss.split('"')[0].strip().rstrip(";").strip()
        examples = [(e.strip(), None) for e in re.findall(r'"([^"]+)"', gloss)][:MAX_EN_EXAMPLES]
        by_pos[pos].append((number, {"meaning": definition, "phrase": None, "examples": examples}))
        usage[pos] += -neg_count

    order = sorted(by_pos, key=lambda p: (-usage[p], min(n for n, _ in by_pos[p])))

    return [(pos, [s for _, s in sorted(by_pos[pos], key=lambda t: t[0])]) for pos in order]


# --- Assemble -------------------------------------------------------------------


def is_real_word(key: str, dwyl: set[str]) -> bool:
    if key in dwyl:
        return True

    parts = key.split("-")

    return len(parts) > 1 and all(p in dwyl for p in parts if p)


def write_shard(path: str, entries: list[dict]) -> tuple[int, int, int]:
    if os.path.exists(path):
        os.remove(path)

    db = sqlite3.connect(path)
    db.execute("PRAGMA journal_mode = DELETE")
    db.executescript(SCHEMA)
    sense_id = 0

    with db:
        for word_id, e in enumerate(entries, start=1):
            db.execute(
                "INSERT INTO words VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (word_id, e["word"], e["display"], e["kind"], e["pos"], e["ipa"], e["meaning_vi"],
                 e["meaning_en"], e["rank"], e["level"]),
            )
            position = 0

            for lang, (pos, senses) in e["groups"]:
                for sense in senses:
                    sense_id += 1
                    position += 1
                    db.execute(
                        "INSERT INTO senses VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (sense_id, word_id, lang, pos, position, sense["phrase"], sense["meaning"]),
                    )
                    db.executemany(
                        "INSERT INTO examples VALUES (?, ?, ?, ?)",
                        [(sense_id, i + 1, text, tr) for i, (text, tr) in enumerate(sense["examples"])],
                    )

    db.execute("VACUUM")
    counts = db.execute(
        "SELECT (SELECT COUNT(*) FROM words), (SELECT COUNT(*) FROM senses), (SELECT COUNT(*) FROM examples)"
    ).fetchone()
    db.close()

    return counts


def main() -> int:
    print("Loading sources ...")
    hnd_path = ensure_source("anhviet109K.txt")
    headers = parse_anhviet(hnd_path)  # word -> {word, ipa, pos, meanings}, first entry
    blocks = parse_hnd(hnd_path)  # word -> [(pos, meanings)] for the summary
    full, idioms = parse_hnd_full(hnd_path)
    wiktionary = parse_wiktionary(ensure_wiktionary())
    wn = WordNet(wordnet_dir())
    cmu = load_cmu()
    wordset = load_wordset()
    ranks = load_ranks()
    dwyl = load_lower_set(WORDS_TXT)

    con = sqlite3.connect(f"file:{BANK}?mode=ro", uri=True)
    bank = {
        w.strip().lower(): {"display": w.strip(), "ipa": ipa, "pos": pos, "meaning_en": en, "meaning_vi": vi}
        for w, ipa, pos, en, vi in con.execute(
            "SELECT word, pronunciation, pos_code, meaning_en, meaning_vi FROM words"
        )
        if w and w.strip()
    }
    con.close()

    stats: collections.Counter = collections.Counter()
    entries: dict[str, dict] = {}

    def summary_en(key: str, pos: str | None) -> str | None:
        found = wordnet_def(wn, key, pos)

        if not found and wordset.get(key):
            found = choose_def(wordset[key], pos)

        return found

    def summary_ipa(key: str, ipa: str | None) -> str | None:
        if ipa and " " not in ipa:
            return f"/{ipa}/"

        phones = cmu_lookup(key, cmu)

        return to_ipa(phones) if phones else None

    def wiktionary_blocks(key: str):
        out = [(pos, [g for g in gl if not POINTER.match(g)]) for pos, gl in wiktionary.get(key, []) if pos]

        return [(pos, gl) for pos, gl in out if gl]

    # 1. Single words: the bank, then Hồ Ngọc Đức, then Wiktionary-only words.
    for key, row in bank.items():
        entries[key] = {"word": key, "kind": "word", **row}
        stats["words from the word bank"] += 1

    for key, rec in headers.items():
        if key in entries or not CLEAN_WORD.match(key) or not is_real_word(key, dwyl):
            continue

        pos = rec["pos"]
        meaning_vi = pick(blocks.get(key, []), pos)

        if not meaning_vi:
            continue

        entries[key] = {
            "word": key, "kind": "word", "display": rec["word"], "pos": pos,
            "ipa": summary_ipa(key, rec["ipa"]), "meaning_vi": meaning_vi, "meaning_en": summary_en(key, pos),
        }
        stats["words from Hồ Ngọc Đức"] += 1

    for key in sorted(wiktionary):
        if key in entries or not CLEAN_WORD.match(key) or wn.base(key) != key:
            continue

        wb = wiktionary_blocks(key)

        if not wb:
            continue

        pos, glosses = wb[0]
        entries[key] = {
            "word": key, "kind": "word", "display": key, "pos": pos, "ipa": summary_ipa(key, None),
            "meaning_vi": build_meaning_vi(glosses[:1]), "meaning_en": summary_en(key, pos),
        }
        stats["words from Wiktionary"] += 1

    # 2. Phrasal verbs and idioms that are not already headwords.
    for key, (display, senses) in idioms.items():
        if key in entries:
            continue

        entries[key] = {
            "word": key, "kind": "phrase", "display": display, "pos": "phrase", "ipa": None,
            "meaning_vi": build_meaning_vi([s["meaning"] for s in senses]),
            "meaning_en": wordnet_def(wn, key, None),
            "phrase_senses": senses,
        }
        stats["phrases (idioms, phrasal verbs)"] += 1

    # 3. Frequency level and every sense.
    courses = course_words()

    for key, e in entries.items():
        if e["kind"] == "phrase":
            parts = [ranks.get(p) for p in re.split(r"[ -]", key) if p]
            e["rank"] = None if None in parts else max(parts)
        else:
            e["rank"] = ranks.get(key)

        e["level"] = level_of(e["rank"])
        stats[f"level {e['level']}"] += 1

        if e["kind"] == "phrase":
            vi = [("phrase", e.pop("phrase_senses"))]
        else:
            vi = full.get(key)

            if not vi:
                vi = [(pos, [new_sense(g) for g in gl]) for pos, gl in wiktionary_blocks(key)] or None

        e["groups"] = [("vi", g) for g in (vi or [])] + [("en", g) for g in wordnet_groups(wn, key)]

    # Course-only words get senses through the same lookup but no summary row of
    # their own: lib/server/dictionaryIndex.ts already knows them from vocab.json.
    for key in sorted(courses - set(entries)):
        vi = full.get(key)
        groups = [("vi", g) for g in (vi or [])] + [("en", g) for g in wordnet_groups(wn, key)]

        if groups and CLEAN_WORD.match(key.replace(" ", "-")):
            rank = ranks.get(key)
            entries[key] = {
                "word": key, "kind": "word", "display": key, "pos": None, "ipa": None,
                "meaning_vi": None, "meaning_en": None, "rank": rank, "level": level_of(rank), "groups": groups,
            }
            stats["course-only words given senses"] += 1

    # 4. Write the shards.
    shards: dict[str, list[dict]] = collections.defaultdict(list)

    for key in sorted(entries):
        shards[shard_of(key)].append(entries[key])

    os.makedirs(OUT_DIR, exist_ok=True)

    for stale in glob.glob(os.path.join(OUT_DIR, "*.db")):
        if os.path.splitext(os.path.basename(stale))[0] not in shards:
            os.remove(stale)

    totals, sizes = [0, 0, 0], {}

    for name in sorted(shards):
        path = os.path.join(OUT_DIR, f"{name}.db")
        totals = [a + b for a, b in zip(totals, write_shard(path, shards[name]))]
        sizes[name] = os.path.getsize(path)

    for label, count in sorted(stats.items()):
        print(f"    {label}: {count:,}")

    largest = max(sizes, key=sizes.get)
    print(f"✓ Wrote {len(sizes)} shards to {os.path.relpath(OUT_DIR, ROOT)}/ — {totals[0]:,} entries, "
          f"{totals[1]:,} senses, {totals[2]:,} examples, {sum(sizes.values()) / 1e6:.1f} MB in all "
          f"(largest {largest}.db {sizes[largest] / 1e6:.1f} MB)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
