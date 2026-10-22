#!/usr/bin/env python3
"""Fill empty ``pronunciation`` in ``data/word-bank.db`` from the CMU Pronouncing
Dictionary, converted from ARPAbet to IPA (American English).

Runs last in the rebuild chain (see "Rebuild order" in
local-docs/project-knowledge.md) and never overwrites an existing value.

    eyelash  AY1 L AE2 SH            -> /ˈaɪˌlæʃ/
    setback  S EH1 T B AE2 K         -> /ˈsɛtˌbæk/
    abstract AE0 B S T R AE1 K T     -> /æbˈstrækt/

Stress marks go before the stressed syllable, found by the maximal-onset rule
(the longest consonant cluster that can start an English syllable). One-syllable
words get no mark. Note the bank now mixes two notations: rows from the Hồ Ngọc
Đức dictionary keep its older British style (/'preznt/, ' for stress).

A word is looked up lower-cased, then by its American spelling (authorisation
-> authorization), then hyphenated words part by part (all-american). The first
listed pronunciation is used.

CMUdict: Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.
BSD-style licence: https://github.com/cmusphinx/cmudict/blob/master/LICENSE
(credited on /english/dictionary).

Usage:
    python scripts/fill_ipa.py            # fill + VACUUM
    python scripts/fill_ipa.py --dry-run  # report counts, write nothing

The dictionary is cached under .dev-data/dict-cache/ (git-ignored). Standard library only.
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
CACHE = os.path.join(ROOT, ".dev-data", "dict-cache", "cmudict.dict")
URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"

VOWELS = {
    "AA": "ɑ", "AE": "æ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ", "EH": "ɛ", "EY": "eɪ",
    "IH": "ɪ", "IY": "i", "OW": "oʊ", "OY": "ɔɪ", "UH": "ʊ", "UW": "u",
}
CONSONANTS = {
    "B": "b", "CH": "tʃ", "D": "d", "DH": "ð", "F": "f", "G": "g", "HH": "h", "JH": "dʒ",
    "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ", "P": "p", "R": "r", "S": "s",
    "SH": "ʃ", "T": "t", "TH": "θ", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}
# Consonant clusters that can begin an English syllable (ARPAbet).
ONSETS = {
    tuple(o.split())
    for o in """
    P R|B R|T R|D R|K R|G R|F R|TH R|SH R|P L|B L|K L|G L|F L|S L|S P|S T|S K|S M|S N|
    S W|T W|D W|K W|G W|TH W|P Y|B Y|K Y|M Y|F Y|HH Y|V Y|S P R|S T R|S K R|S P L|S K W|S K Y|S P Y
    """.replace("\n", "").split("|")
    if o.strip()
}
# British ending -> American ending, since CMUdict is American.
US_ENDINGS = [("our", "or"), ("re", "er"), ("ise", "ize"), ("isation", "ization"), ("ised", "ized"),
              ("ising", "izing"), ("yse", "yze"), ("ogue", "og"), ("elled", "eled"), ("elling", "eling")]


def load_cmu() -> dict[str, list[str]]:
    if not os.path.exists(CACHE):
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        print(f"  downloading {URL}")
        urllib.request.urlretrieve(URL, CACHE)

    out: dict[str, list[str]] = {}

    with open(CACHE, encoding="latin-1") as fh:
        for line in fh:
            word, *phones = line.split("#")[0].split()
            out.setdefault(re.sub(r"\(\d+\)$", "", word), phones)  # first pronunciation wins

    return out


def to_ipa(phones: list[str]) -> str:
    base = [re.sub(r"\d", "", p) for p in phones]
    stress = [p[-1] if p[-1].isdigit() else None for p in phones]
    vowels = [i for i, s in enumerate(stress) if s is not None]
    marks: dict[int, str] = {}

    for n, v in enumerate(vowels):
        if stress[v] not in "12" or len(vowels) == 1:
            continue

        # Walk back over consonants after the previous vowel; keep the longest legal onset.
        start = vowels[n - 1] + 1 if n else 0
        onset = v

        for k in range(v - 1, start - 1, -1):
            cluster = tuple(base[k:v])

            if len(cluster) == 1 or cluster in ONSETS:
                onset = k
            else:
                break

        marks[onset if n else 0] = "ˈ" if stress[v] == "1" else "ˌ"

    out = []

    for i, (p, s) in enumerate(zip(base, stress)):
        out.append(marks.get(i, ""))

        if p == "AH":
            out.append("ʌ" if s in "12" else "ə")
        elif p == "ER":
            out.append("ɝ" if s in "12" else "ɚ")
        else:
            out.append(VOWELS.get(p) or CONSONANTS[p])

    return "/" + "".join(out) + "/"


def lookup(word: str, cmu: dict[str, list[str]]) -> list[str] | None:
    w = word.lower()

    if w in cmu:
        return cmu[w]

    for uk, us in US_ENDINGS:
        if w.endswith(uk) and (alt := w[: -len(uk)] + us) in cmu:
            return cmu[alt]

    if "-" in w and w.replace("-", "") in cmu:
        return cmu[w.replace("-", "")]

    parts = [p for p in w.split("-") if p]

    if len(parts) > 1 and all(p in cmu for p in parts):
        return [ph for p in parts for ph in cmu[p]]

    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="report counts, write nothing")
    args = ap.parse_args()

    cmu = load_cmu()
    db = sqlite3.connect(DB_PATH)
    rows = db.execute(
        "SELECT id, word FROM words WHERE pronunciation IS NULL OR TRIM(pronunciation) = ''"
    ).fetchall()
    updates, missing = [], []

    for row_id, word in rows:
        phones = lookup(word, cmu)

        if phones:
            updates.append((to_ipa(phones), row_id))
        else:
            missing.append(word)

    print(f"  empty pronunciation: {len(rows):,}  ·  filled from CMUdict: {len(updates):,}")
    print(f"  still empty: {len(missing):,}  e.g. {', '.join(missing[:12])}")

    if args.dry_run:
        db.close()

        return 0

    with db:
        db.executemany("UPDATE words SET pronunciation = ? WHERE id = ?", updates)

    db.execute("VACUUM")
    db.close()
    print(f"✓ Filled {len(updates):,} rows in {os.path.relpath(DB_PATH, ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
