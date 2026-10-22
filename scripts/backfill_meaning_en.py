#!/usr/bin/env python3
"""Backfill the ``meaning_en`` column in ``data/word-bank.db`` for rows that lack
an English gloss (the bulk words imported by import_dictionary.py have none,
because the Anh–Việt source is Vietnamese-only).

TOKEN-FREE: pulls concise, modern English definitions from the open
**wordset-dictionary** (MIT), split a.json … z.json, each entry shaped like:

    "abandon": { "meanings": [ { "def": "...", "speech_part": "verb" }, ... ] }

For each DB word with meaning_en IS NULL we first take WordNet's most-used
sense (by tagged-corpus count) in the row's part of speech — wordset's own
order put rare senses first (have = "cause to be born", perhaps = "an action
that might occur by chance"). Words WordNet lacks fall back to the wordset
definition whose ``speech_part`` matches the row's ``pos_code``, else its first.
Rows that already have meaning_en are left untouched.

Usage:
    python scripts/backfill_meaning_en.py            # download + backfill
    python scripts/backfill_meaning_en.py --dry-run  # report counts only

Sources cached under .dev-data/dict-cache/ (git-ignored). Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "word-bank.db")
CACHE_DIR = os.path.join(ROOT, ".dev-data", "dict-cache", "wordset")
BASE = "https://raw.githubusercontent.com/wordset/wordset-dictionary/master/data/"

# pos_code (our schema) -> wordset speech_part
POS_TO_SPEECH = {
    "n": "noun", "v": "verb", "adj": "adjective", "adv": "adverb",
    "prep": "preposition", "conj": "conjunction", "pron": "pronoun",
    "int": "interjection",
}
MEANING_MAX = 240


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def load_wordset() -> dict:
    """Return {lower_word: [ {def, speech_part}, ... ]} for a..z."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    out: dict[str, list] = {}
    for letter in "abcdefghijklmnopqrstuvwxyz":
        dest = os.path.join(CACHE_DIR, f"{letter}.json")
        if not (os.path.exists(dest) and os.path.getsize(dest) > 0):
            log(f"  downloading {letter}.json ...")
            req = urllib.request.Request(BASE + f"{letter}.json",
                                         headers={"User-Agent": "backfill"})
            try:
                data = urllib.request.urlopen(req, timeout=180).read()
            except Exception as e:  # some letters may be missing
                log(f"    skip {letter}.json ({e})")
                continue
            with open(dest, "wb") as f:
                f.write(data)
        with open(dest, encoding="utf-8", errors="replace") as f:
            try:
                obj = json.load(f)
            except Exception as e:
                log(f"    parse fail {letter}.json ({e})")
                continue
        for key, entry in obj.items():
            means = entry.get("meanings") or []
            slim = [
                {"def": m.get("def", "").strip(), "sp": (m.get("speech_part") or "").strip()}
                for m in means if m.get("def")
            ]
            if slim:
                out[key.strip().lower()] = slim
    return out


WN_TYPES = {"n": {"n"}, "v": {"v"}, "adj": {"a", "s"}, "adv": {"r"}}


def wordnet_def(wn, word: str, pos_code: str | None) -> str | None:
    """WordNet's most-used sense of `word`, in `pos_code` when it has one there."""
    ranked = [k for *_, k in sorted(wn.senses.get(wn.base(word), [])) if k in wn.synsets]
    wanted = WN_TYPES.get(pos_code or "")
    in_pos = [k for k in ranked if wanted and wn.synsets[k][0] in wanted]
    keys = in_pos or ranked

    if not keys:
        return None

    return wn.synsets[keys[0]][2].split('"')[0].strip().rstrip(";").strip() or None


def choose_def(meanings: list, pos_code: str | None) -> str:
    want = POS_TO_SPEECH.get(pos_code or "")
    if want:
        for m in meanings:
            if m["sp"] == want:
                return m["def"]
    return meanings[0]["def"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(DB_PATH):
        log(f"✗ {DB_PATH} not found.")
        return 1

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from repair_word_meanings import WordNet, wordnet_dir

    log("Loading WordNet + wordset-dictionary ...")
    wn = WordNet(wordnet_dir())
    ws = load_wordset()
    log(f"  wordset words: {len(ws):,}")

    db = sqlite3.connect(DB_PATH)
    db.execute("PRAGMA journal_mode = DELETE;")
    targets = db.execute(
        "SELECT id, word, pos_code FROM words WHERE meaning_en IS NULL OR meaning_en = ''"
    ).fetchall()
    log(f"  rows missing meaning_en: {len(targets):,}")

    updates = []
    from_wordnet = 0
    for wid, word, pos in targets:
        key = word.strip().lower()
        d = wordnet_def(wn, key, pos)

        if d:
            from_wordnet += 1
        elif ws.get(key):
            d = choose_def(ws[key], pos)
        else:
            continue

        if len(d) > MEANING_MAX:
            d = d[:MEANING_MAX].rstrip() + "…"
        updates.append((d, wid))

    log(f"  will fill: {len(updates):,} ({from_wordnet:,} from WordNet)  (no match: {len(targets) - len(updates):,})")

    if args.dry_run:
        db.close()
        for d, wid in updates[:10]:
            w = next(t[1] for t in targets if t[0] == wid)
            log(f"    {w:16} -> {d[:70]}")
        log("(dry run — nothing written)")
        return 0

    with db:
        db.executemany("UPDATE words SET meaning_en = ? WHERE id = ?", updates)
    db.execute("VACUUM;")
    filled = db.execute("SELECT COUNT(*) FROM words WHERE meaning_en IS NOT NULL AND meaning_en != ''").fetchone()[0]
    total = db.execute("SELECT COUNT(*) FROM words").fetchone()[0]
    db.close()
    log(f"\n✓ Filled {len(updates):,} rows. meaning_en now populated on {filled:,}/{total:,} words.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
