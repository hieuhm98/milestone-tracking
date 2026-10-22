#!/usr/bin/env python3
"""Bulk-import common English words (with Vietnamese meaning + IPA pronunciation)
into the SQL-practice word bank at ``data/word-bank.db``.

WHY THIS IS TOKEN-FREE
----------------------
We do NOT ask an LLM to translate ~466k words (that would be hundreds of millions
of tokens). Instead we JOIN existing, free, open dictionary datasets:

  * anhviet109K.txt  – the Hồ Ngọc Đức Anh–Việt dictionary (~109k entries).
      Each entry already carries the word, IPA pronunciation, part-of-speech and
      the Vietnamese meaning:
          @a-bomb /'ei'bɔm/        -> word + IPA
          *  danh từ               -> part of speech (Vietnamese)
          - bom nguyên tử          -> Vietnamese meaning
  * en_50k.txt       – hermitdave/FrequencyWords, the 50k most-frequent English
      words (from a subtitle corpus). Used to CURATE down to common words.
  * local-docs/words.txt – the user's own English word list; a candidate must
      appear here too, so we only ever enrich words that are actually in it.

FILTERING (per the user's decision)
-----------------------------------
A word is imported only if ALL hold:
  1. it has a Vietnamese meaning in the dictionary,
  2. it is a "common" word (present in the 50k frequency list),
  3. it is in the user's local-docs/words.txt,
  4. it is a clean single token (letters, optional internal - or '),
  5. it is NOT already present in word-bank.db (dupes are dropped).
Everything else is discarded — no empty rows, no machine guesses.

This is ADDITIVE: it appends to whatever `words` rows already exist (e.g. the
curated flashcards from seed-word-bank.mjs) and continues the id sequence. It is
idempotent — re-running skips words already imported. Existing rows and the
`word_reviews` / `parts_of_speech` tables are left untouched.

NOTE ON ORDERING: seed-word-bank.mjs REBUILDS word-bank.db from scratch. If you
re-run that seeder, run THIS script again afterwards to re-add the bulk words.

Usage:
    python scripts/import_dictionary.py            # download sources if needed, import
    python scripts/import_dictionary.py --dry-run  # report counts, write nothing

Source files are cached under .dev-data/dict-cache/ (git-ignored). Uses only the
Python standard library (sqlite3) — no better-sqlite3 / native build needed.
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "word-bank.db")
WORDS_TXT = os.path.join(ROOT, "local-docs", "words.txt")
CACHE_DIR = os.path.join(ROOT, ".dev-data", "dict-cache")

SOURCES = {
    "anhviet109K.txt": "https://raw.githubusercontent.com/yenthanh132/"
    "avdict-database-sqlite-converter/master/anhviet109K.txt",
    "en_50k.txt": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/"
    "master/content/2018/en/en_50k.txt",
}

# Vietnamese part-of-speech phrase -> pos_code used by the schema's
# parts_of_speech table. Order is irrelevant: we pick the phrase that appears
# earliest in the "*" line.
POS_VI = [
    ("danh từ", "n"),
    ("động từ", "v"),
    ("tính từ", "adj"),
    ("phó từ", "adv"),
    ("trạng từ", "adv"),
    ("giới từ", "prep"),
    ("liên từ", "conj"),
    ("đại từ", "pron"),
    ("thán từ", "int"),
    ("viết tắt", "abbr"),
]

# Wrapped tails of a long "@" header that landed on "-" meaning lines:
# "- pri'zent/" (a second IPA) and "-morrow)" (a "(to-morrow)" variant).
HEADER_TAIL = re.compile(r"^([^\s;]+/|[^\s(]+\))$")
CLEAN_WORD = re.compile(r"^[a-z]([a-z'-]*[a-z])?$")
MEANING_MAX = 240  # keep meaning_vi compact


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def ensure_source(name: str) -> str:
    """Return a local path to source `name`, downloading to the cache if absent."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    dest = os.path.join(CACHE_DIR, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    url = SOURCES[name]
    log(f"  downloading {name} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "import_dictionary"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = r.read()
    with open(dest, "wb") as f:
        f.write(data)
    log(f"  saved {name} ({len(data):,} bytes)")
    return dest


def map_pos(star_line: str):
    """Map a '* ...' POS line to a pos_code (earliest-matching phrase wins)."""
    best_idx, best_code = None, None
    for phrase, code in POS_VI:
        i = star_line.find(phrase)
        if i != -1 and (best_idx is None or i < best_idx):
            best_idx, best_code = i, code
    return best_code


def parse_header(body: str) -> tuple[str, str]:
    """Split an '@' line into (word, IPA).

    Over half the headers list variants, and used to be dropped whole because
    the line was taken as the word:
        have /hæv, həv, v/ (has) /hæz, həz, əz, z/   -> ("have", "hæv")
        everyone /'evribɔdi/ (everyone) /'evriwʌn/  -> ("everyone", "'evriwʌn")
    The word is the text before the first '/'. The IPA is the word's own
    "(word) /…/" group when there is one (the first group can belong to a
    variant, as with everybody's above), else the first group; and of several
    pronunciations, the first.
    """
    word = body.split("/", 1)[0].strip()
    groups = re.findall(r"(?:\(([^()]*)\)\s*)?/([^/]*)/", body)

    if not groups:
        return word, ""

    own = [ipa for label, ipa in groups if label.strip().lower() == word.lower()]
    ipa = (own or [groups[0][1]])[0]
    # Variants are split by ", " or " - " ("pə'hæps, (Àthtục) præps", "'preznt - pri'zent").
    # A bare "," is this dictionary's secondary-stress mark (",ækju:'zeiʃn"), so keep it.
    ipa = re.sub(r"\([^)]*\)", "", re.split(r",\s+|\s+-\s+", ipa)[0]).strip()

    if " " in ipa:
        ipa = ""  # a few headers lost characters ("utmost /' tmoust/"); better none than wrong

    return word, ipa


def parse_anhviet(path: str) -> dict:
    """Parse the Anh–Việt dictionary into {lower_word: record}. First entry wins."""
    by_word: dict[str, dict] = {}
    cur = None
    with open(path, encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.rstrip("\n").lstrip("﻿")
            if line.startswith("@"):
                word, ipa = parse_header(line[1:])
                cur = {"word": word, "ipa": ipa, "pos": None, "meanings": []}
                key = word.lower()
                if key not in by_word:  # keep the first (primary) sense block
                    by_word[key] = cur
            elif cur is None:
                continue
            elif line.startswith("*"):
                if cur["pos"] is None:
                    cur["pos"] = map_pos(line)
            elif line.startswith("-"):
                mean = line[1:].strip()
                if mean and not HEADER_TAIL.match(mean):
                    cur["meanings"].append(mean)
    return by_word


def build_meaning_vi(meanings: list[str]) -> str:
    """Join the first few sense lines into one compact meaning string."""
    out = "; ".join(meanings[:3]).strip()
    if len(out) > MEANING_MAX:
        cut = out.rfind("; ", 0, MEANING_MAX)
        out = out[:cut] if cut > 40 else out[:MEANING_MAX].rstrip()
    return out


def load_lower_set(path: str) -> set:
    s = set()
    with open(path, encoding="utf-8", errors="replace") as f:
        for ln in f:
            w = ln.strip().lower()
            if w:
                s.add(w)
    return s


def load_freq(path: str) -> set:
    s = set()
    with open(path, encoding="utf-8", errors="replace") as f:
        for ln in f:
            w = ln.split(" ", 1)[0].strip().lower()
            if w:
                s.add(w)
    return s


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="report counts, write nothing")
    args = ap.parse_args()

    if not os.path.exists(DB_PATH):
        log(f"✗ {DB_PATH} not found. Seed the word bank first (scripts/seed-word-bank.mjs).")
        return 1
    if not os.path.exists(WORDS_TXT):
        log(f"✗ {WORDS_TXT} not found.")
        return 1

    log("Loading sources ...")
    dict_path = ensure_source("anhviet109K.txt")
    freq_path = ensure_source("en_50k.txt")

    by_word = parse_anhviet(dict_path)
    freq = load_freq(freq_path)
    user_words = load_lower_set(WORDS_TXT)
    log(f"  dictionary entries: {len(by_word):,}")
    log(f"  frequency words:    {len(freq):,}")
    log(f"  user words.txt:     {len(user_words):,}")

    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode = DELETE;")  # single self-contained file (commit-friendly)
    existing = {w.lower() for (w,) in db.execute("SELECT word FROM words")}
    next_id = (db.execute("SELECT COALESCE(MAX(id), 0) FROM words").fetchone()[0]) + 1
    log(f"  words already in DB: {len(existing):,} (next id = {next_id})")

    rows = []
    skipped_no_meaning = skipped_uncommon = skipped_dup = skipped_dirty = 0
    for key, rec in by_word.items():
        if not CLEAN_WORD.match(key):
            skipped_dirty += 1
            continue
        if key not in freq or key not in user_words:
            skipped_uncommon += 1
            continue
        if key in existing:
            skipped_dup += 1
            continue
        meaning_vi = build_meaning_vi(rec["meanings"])
        if not meaning_vi:
            skipped_no_meaning += 1
            continue
        word = rec["word"]
        rows.append(
            {
                "word": word,
                "pronunciation": f"/{rec['ipa']}/" if rec["ipa"] else None,
                "pos_code": rec["pos"],
                "meaning_en": None,  # Anh–Việt source has no English gloss
                "meaning_vi": meaning_vi,
                "first_letter": word[0].upper(),
                "length": len(word),
            }
        )

    # Second source: common words the Anh–Việt dictionary lacks (eyelash, setback,
    # newsletter) from Kaikki's Vietnamese-Wiktionary extract (CC BY-SA, credited on
    # /english/dictionary). Same filters, plus: a real part of speech (names and
    # places are "name" there), not an inflection of a word WordNet knows
    # ("looks"), and no "Xem …" / "Tên …" pointer gloss. Only the first plain gloss
    # is kept: later ones can be slang ("airbag" = a chatterbox).
    from fill_meaning_vi import ensure_wiktionary, parse_wiktionary
    from repair_word_meanings import WordNet, wordnet_dir

    wiktionary = parse_wiktionary(ensure_wiktionary())
    wn = WordNet(wordnet_dir())
    taken = existing | {r["word"].lower() for r in rows}
    pointer = re.compile(r"^(xem|tên|họ|một tên)\b", re.I)
    from_wiktionary = 0

    for key in sorted(freq):
        if key in taken or not CLEAN_WORD.match(key) or key not in user_words or key not in wiktionary:
            continue

        if wn.base(key) != key:
            continue

        blocks = [(pos, [g for g in glosses if not pointer.match(g)]) for pos, glosses in wiktionary[key] if pos]
        blocks = [(pos, glosses) for pos, glosses in blocks if glosses]

        if not blocks:
            continue

        pos, glosses = blocks[0]
        rows.append(
            {
                "word": key,
                "pronunciation": None,
                "pos_code": pos,
                "meaning_en": None,
                "meaning_vi": build_meaning_vi(glosses[:1]),
                "first_letter": key[0].upper(),
                "length": len(key),
            }
        )
        from_wiktionary += 1

    # Deterministic order (alphabetical) so ids/DB bytes are stable across runs.
    rows.sort(key=lambda r: r["word"].lower())

    log("\n=== filter summary ===")
    log(f"  dropped (not clean single token): {skipped_dirty:,}")
    log(f"  dropped (not common / not in words.txt): {skipped_uncommon:,}")
    log(f"  dropped (already in DB): {skipped_dup:,}")
    log(f"  dropped (no Vietnamese meaning): {skipped_no_meaning:,}")
    log(f"  --> to import: {len(rows):,} ({from_wiktionary:,} of them from Wiktionary)")
    with_ipa = sum(1 for r in rows if r["pronunciation"])
    with_pos = sum(1 for r in rows if r["pos_code"])
    log(f"      of which have IPA: {with_ipa:,} | have POS: {with_pos:,}")

    if args.dry_run:
        log("\n(dry run — nothing written)")
        for r in rows[:10]:
            log(f"    {r['word']:16} {r['pronunciation']}  {r['pos_code']}  {r['meaning_vi'][:50]}")
        db.close()
        return 0

    insert = db.execute
    with db:  # single transaction
        for i, r in enumerate(rows):
            r["id"] = next_id + i
            insert(
                """INSERT INTO words
                   (id, word, pronunciation, pos_code, meaning_en, meaning_vi, first_letter, length)
                   VALUES (:id, :word, :pronunciation, :pos_code, :meaning_en, :meaning_vi, :first_letter, :length)""",
                r,
            )
    db.execute("VACUUM;")  # compact before committing the file
    total = db.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    db.close()

    size_kb = os.path.getsize(DB_PATH) / 1024
    log(f"\n✓ Imported {len(rows):,} words. `words` now has {total:,} rows.")
    log(f"  {DB_PATH} — {size_kb:,.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
