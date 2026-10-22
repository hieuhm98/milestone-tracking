#!/usr/bin/env python3
"""Repair ``../flash-card-english/flashcards.json``: meanings on the wrong word,
duplicate cards whose "word" is really IPA, and broken headwords.

THE PROBLEM
-----------
The 4,974 cards are in alphabetical order, but about two thirds of their backs
(part of speech + English meaning + optional Vietnamese) belong to another word:

    insubordinate   -> "the act of instituting"        (institution's meaning)
    insubordination -> "state of being insular"        (insularity's meaning)
    mystic          -> "short-sighted"                 (myopic's meaning)

On top of that ~100 cards have IPA as their word ("fɔil", "flʌ∫") — every one of
them duplicates a real card (foil, flush) — and a few words carry junk
("asunder ư]", "scapegoat = fall-guy").

HOW IT IS FIXED (token-free, deterministic)
-------------------------------------------
Each meaning is scored against Princeton WordNet 3.0 for a given word: the
share of its content words that appear in that word's WordNet definitions,
synonyms and related forms (6-letter stems, so "rebellious" meets "rebel").
Plurals and inflections are looked up by their base form (cohorts -> cohort).
A meaning that uses the word itself ("being insubordinate") cannot define it,
and a meaning built on a shorter form of the word ("state of being insular")
points at the derived word (insularity).

  1. Drop the IPA duplicates and clean the broken headwords (explicit lists).
  2. Nearby swap — a word whose meaning does not fit takes the back of a card
     up to 15 rows away when it fits clearly and does not fit its own card.
     The whole back moves verbatim. (Hand-checked sample: ~97% right.)
     Far-away swaps were tried and dropped: only ~50% were right.
  3. WordNet definition — replaces a back that moved to another word or does
     not fit at all. It uses WordNet's most-used sense of the word (by tagged
     corpus count, across parts of speech). Its Vietnamese goes too; the
     word-bank scripts refill Vietnamese from the Hồ Ngọc Đức dictionary.
     A rule replacing *borderline* meanings that fit another card's word far
     better was tried and dropped: ~80% of what it replaced was already right.

Words WordNet does not know keep their back: nothing can check them.

Usage:
    python scripts/repair_word_meanings.py --dry-run   # report, write nothing
    python scripts/repair_word_meanings.py             # rewrite flashcards.json (keeps a .bak)

Then rebuild the word bank — see "Rebuild order" in local-docs/project-knowledge.md.
Running it again on the repaired file changes (almost) nothing.

WordNet is cached under .dev-data/dict-cache/ (git-ignored). Standard library only.
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import shutil
import sys
import tarfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(ROOT, ".dev-data", "dict-cache")
CARDS_PATH = os.environ.get(
    "FLASHCARDS_JSON", os.path.join(ROOT, "..", "flash-card-english", "flashcards.json")
)
WORDNET_URL = "https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz"  # has the .exc tables

WINDOW = 15  # cards either side searched for a nearby swap
FIT = 0.3  # below this a meaning "does not fit" its word
MISFIT = 0.1  # below this a meaning is replaced outright

# Cards whose "word" is IPA. Each duplicates a real card (noted after the #
# where the IPA is not obvious), and its back belongs to a neighbour anyway.
IPA_DUPLICATES = set("""
di'kænt dʒaib dʒen'ti:l dʒen'tiliti dʒes,tikju'lei∫n dʒi'nerik dʒist faul fein feit
feiz fel fi'deliti fi'nes fi'nɑ:li fi'æskou fi:nd fik'ti∫əs filt∫ filθ fju:d
fju:zi'leid flaut flei fleil flek fleə fli:s fli:t flik flint∫ flou flu:k
flɔ:'resns flɔ:nt flə:t flʌks flʌ∫ fou'ment frei freil fri'netik fri:z frindʒ
fru:'gæliti fru:'i∫n frɔ:t frɔk frɔnd frʌs'treit fɑ:s fɔ:'boudiη fɔ:'gou fɔ:d
fɔil fɔist fə'lisiti fə'rensik fə'seik fə:men'tei∫n fʌs gaudʒ geil gein'sei geip
geit gleiz gleə gli:m gli:n glou glout glɔs glʌt goud gou∫ gæf gɔ:k gɔ:nt
gə'ru:liti gə'zet kou'ket kɔi kɔn'sentrik kɔri'lei∫n kən'dain noum nɑ:l nɑ:ld
""".split())

# Broken headwords -> the word the card is about (None = drop the card).
HEADWORD_FIXES = {
    "asunder ư]": "asunder",
    "connoisseur ]": "connoisseur",
    "rigor  = rigour": "rigor",
    "scapegoat = fall-guy": "scapegoat",
    "seismic = seismal": "seismic",
    "maleficient": "maleficent",
    "mutablility": "mutability",
    "unintimating": "unintimidated",
    "prefix:": "prefix",
    "arch-": None,  # a prefix, not a word; its back is "arcade"'s
    "tiltable": None,  # back is a miser's meaning; no such word to define
}

STOP = set(
    """a an the of or to in and for with by on as be is are that which from at its it
    this into out up sb sth someone something person thing things etc usu esp eg ie one
    who whom make made being been very not no any some more most such than other""".split()
)

POS_RE = re.compile(r"^\s*(abbr|adj|adv|conj|pron|prep|int|n|v)\b\.?", re.I)
WN_POS = {"n": "n", "v": "v", "a": "adj", "s": "adj", "r": "adv"}
SS_TYPES = {"1": "n", "2": "v", "3": "a", "4": "r", "5": "s"}  # digit in a WordNet sense key
POS_RANK = {"n": 0, "v": 1, "a": 2, "s": 2, "r": 3}  # tie-break between equally used senses

# WordNet "morphy" suffix rules, by part of speech.
SUFFIXES = {
    "noun": [("s", ""), ("ses", "s"), ("xes", "x"), ("zes", "z"), ("ches", "ch"), ("shes", "sh"),
             ("men", "man"), ("ies", "y")],
    "verb": [("s", ""), ("ies", "y"), ("es", "e"), ("es", ""), ("ed", "e"), ("ed", ""),
             ("ing", "e"), ("ing", "")],
    "adj": [("er", ""), ("est", ""), ("er", "e"), ("est", "e")],
    "adv": [],
}


def stem(token: str) -> str:
    return token[:6]


def stems(text: str | None) -> set[str]:
    words = re.findall(r"[a-z]+", (text or "").lower())

    return {stem(t) for t in words if t not in STOP and len(t) > 2}


def common_prefix(a: str, b: str) -> int:
    n = 0

    for x, y in zip(a, b):
        if x != y:
            break

        n += 1

    return n


# --- WordNet ------------------------------------------------------------------


def wordnet_dir() -> str:
    data_dir = os.path.join(CACHE_DIR, "WordNet-3.0", "dict")

    if os.path.exists(os.path.join(data_dir, "data.noun")):
        return data_dir

    os.makedirs(CACHE_DIR, exist_ok=True)
    archive = os.path.join(CACHE_DIR, "WordNet-3.0.tar.gz")

    if not os.path.exists(archive):
        print(f"  downloading {WORDNET_URL}")
        urllib.request.urlretrieve(WORDNET_URL, archive)

    with tarfile.open(archive) as tar:
        tar.extractall(CACHE_DIR, filter="data")

    return data_dir


class WordNet:
    def __init__(self, data_dir: str):
        self.synsets: dict[tuple[str, str], tuple[str, list[str], str, list]] = {}
        self.by_lemma: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
        self.exceptions: dict[str, str] = {}
        self.senses: dict[str, list[tuple[int, int, int, tuple[str, str]]]] = collections.defaultdict(list)

        for name in ("noun", "verb", "adj", "adv"):
            with open(os.path.join(data_dir, f"data.{name}"), encoding="latin-1") as fh:
                for line in fh:
                    if not line.startswith("  "):  # skip the licence header
                        self._parse(line)

            with open(os.path.join(data_dir, f"{name}.exc"), encoding="latin-1") as fh:
                for line in fh:
                    inflected, base, *_ = line.split()
                    self.exceptions.setdefault(inflected.replace("_", " "), base.replace("_", " "))

        # sense_key offset sense_number tag_count, e.g. "fret%2:37:03:: 01793933 1 3"
        with open(os.path.join(data_dir, "index.sense"), encoding="latin-1") as fh:
            for line in fh:
                sense_key, offset, number, count = line.split()
                lemma, _, rest = sense_key.partition("%")
                ss_type = SS_TYPES[rest[0]]
                rank = (-int(count), int(number), POS_RANK[ss_type])
                self.senses[lemma.replace("_", " ")].append((*rank, (ss_type, offset)))

    def _parse(self, line: str) -> None:
        head, _, gloss = line.partition("|")
        f = head.split()
        offset, ss_type, n = f[0], f[2], int(f[3], 16)
        lemmas = [re.sub(r"\(.*\)$", "", f[4 + 2 * i]).lower().replace("_", " ") for i in range(n)]
        k = 4 + 2 * n
        pointers = [(f[k + 1 + 4 * j], f[k + 2 + 4 * j], f[k + 3 + 4 * j]) for j in range(int(f[k]))]
        key = (ss_type, offset)
        self.synsets[key] = (ss_type, lemmas, gloss.strip(), pointers)

        for lemma in lemmas:
            self.by_lemma[lemma].append(key)

    def base(self, word: str) -> str:
        """The form WordNet files `word` under (cohorts -> cohort, vying -> vie)."""
        if word in self.by_lemma:
            return word

        if self.exceptions.get(word) in self.by_lemma:
            return self.exceptions[word]

        for rules in SUFFIXES.values():
            for old, new in rules:
                if word.endswith(old) and (cand := word[: len(word) - len(old)] + new) in self.by_lemma:
                    return cand

        return word

    def _target(self, pos: str, offset: str):
        # Pointers name adjective satellites as "s" or "a" interchangeably.
        return self.synsets.get((pos, offset)) or self.synsets.get(("s" if pos == "a" else "a", offset))

    def bag(self, word: str) -> set[str]:
        """Stems of everything WordNet says about `word`."""
        out: set[str] = set()
        word = self.base(word)

        for key in self.by_lemma.get(word, []):
            _, lemmas, gloss, pointers = self.synsets[key]
            out |= stems(gloss)
            out |= {stem(l) for l in lemmas if l != word}

            for symbol, offset, pos in pointers:
                # derivation, pertainym, attribute, similar-to, hypernym
                if symbol in ("+", "\\", "=", "&", "@"):
                    target = self._target(pos, offset)

                    if target:
                        out |= {stem(l) for l in target[1]}

        return out

    def definition(self, word: str) -> tuple[str, str] | None:
        """(pos_code, definition) of the word's most-used sense in any part of speech."""
        ranked = sorted(self.senses.get(self.base(word), []))
        keys = [k for *_, k in ranked if k in self.synsets] or self.by_lemma.get(self.base(word), [])

        if not keys:
            return None

        ss_type, _, gloss, _ = self.synsets[keys[0]]
        text = gloss.split('"')[0].strip().rstrip(";").strip()

        return WN_POS[ss_type], text


# --- Cards ----------------------------------------------------------------------


def english_part(back: str) -> str:
    en = str(back or "").split("|")[0].strip()
    m = POS_RE.match(en)

    if m:
        en = re.sub(r"^[.\s~]+", "", en[m.end():])

    return en.strip()


def fit(word: str, meaning: str | None, bag: set[str]) -> float | None:
    """How well `meaning` defines `word` (None = cannot tell)."""
    words = re.findall(r"[a-z]+", (meaning or "").lower())

    if len(word) >= 4 and any(t.startswith(word) for t in words):
        return -1.0  # uses the word itself, so it defines a neighbour

    tokens = stems(meaning)

    if not tokens:
        return None

    score = len(tokens & bag) / len(tokens) if bag else 0.0

    for t in words:
        # "state of being insular" -> insularity
        if 5 <= len(t) < len(word) and common_prefix(t, word) >= max(5, int(0.7 * len(t))):
            score += 0.5
            break

    return score


def clean_headwords(cards: list[dict], stats: collections.Counter) -> list[dict]:
    out = []

    for card in cards:
        front = str(card.get("front") or "").strip()

        if front in IPA_DUPLICATES:
            stats["dropped: IPA duplicate"] += 1
            continue

        if front in HEADWORD_FIXES:
            fixed = HEADWORD_FIXES[front]

            if fixed is None:
                stats["dropped: not a word"] += 1
                continue

            card = {**card, "front": fixed}
            stats["headword cleaned"] += 1

        out.append(card)

    return out


def repair(cards: list[dict], wn: WordNet) -> tuple[list[dict], collections.Counter]:
    stats: collections.Counter = collections.Counter()
    cards = clean_headwords(cards, stats)
    n = len(cards)
    keys = [c["front"].strip().lower() for c in cards]
    backs = [c["back"] for c in cards]
    meanings = [english_part(b) for b in backs]
    bags = [wn.bag(k) for k in keys]
    cache: dict[tuple[int, int], float | None] = {}

    def score(i: int, j: int) -> float | None:
        if (i, j) not in cache:
            cache[(i, j)] = fit(keys[i], meanings[j], bags[i])

        return cache[(i, j)]

    def own(i: int) -> float:
        s = score(i, i)

        return 0.0 if s is None else s

    def acceptable(i: int, j: int) -> float | None:
        v = score(i, j)

        if v is None or own(j) >= FIT or own(i) >= FIT:
            return None

        need = 0.99 if len(stems(meanings[j])) <= 2 else 0.5  # one shared word is not proof

        if not bags[j]:
            need = max(need, 0.75)  # its own card cannot be checked, so be stricter

        return v if v >= need and v >= own(i) + 0.35 else None

    # Nearby swaps: each meaning goes to the word it fits best, each word takes one.
    best_for_meaning: dict[int, tuple[int, float]] = {}

    for i in range(n):
        if not bags[i]:
            continue

        scored = [
            (v, j)
            for j in range(max(0, i - WINDOW), min(n, i + WINDOW + 1))
            if j != i and (v := acceptable(i, j)) is not None
        ]

        if not scored:
            continue

        v, j = max(scored)

        if j not in best_for_meaning or best_for_meaning[j][1] < v:
            best_for_meaning[j] = (i, v)

    takes = {i: j for j, (i, _) in best_for_meaning.items()}
    taken = set(takes.values())

    out = []

    for i, card in enumerate(cards):
        if i in takes:
            out.append({**card, "back": backs[takes[i]]})
            stats["meaning moved from a nearby card"] += 1
            continue

        reason = None

        if i in taken:
            reason = "its meaning moved to another word"
        elif bags[i] and own(i) < MISFIT:
            reason = "meaning does not fit"

        definition = wn.definition(keys[i]) if reason else None

        if definition:
            pos, text = definition
            back = f"{pos}. {text}"
            out.append({**card, "back": back})

            # A WordNet definition that already sits on its word is not a change.
            if back != card["back"]:
                stats[f"WordNet definition: {reason}"] += 1
        else:
            out.append(card)

            if reason:
                stats[f"kept (no WordNet entry): {reason}"] += 1

    return out, stats


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="report counts, write nothing")
    args = ap.parse_args()

    if not os.path.exists(CARDS_PATH):
        print(f"✗ Flashcards source not found: {CARDS_PATH} (set FLASHCARDS_JSON)")
        return 1

    with open(CARDS_PATH, encoding="utf-8") as fh:
        cards = json.load(fh)

    repaired, stats = repair(cards, WordNet(wordnet_dir()))
    changed = sum(1 for _ in stats.elements()) - sum(v for k, v in stats.items() if k.startswith("kept"))

    print(f"  cards: {len(cards)} -> {len(repaired)}  ·  changes: {changed}")

    for label, count in sorted(stats.items()):
        print(f"    {label}: {count}")

    if args.dry_run:
        return 0

    shutil.copyfile(CARDS_PATH, CARDS_PATH + ".bak")

    with open(CARDS_PATH, "w", encoding="utf-8") as fh:
        json.dump(repaired, fh, ensure_ascii=False, indent=4)  # the file's own format

    print(f"✓ Rewrote {CARDS_PATH} (previous copy: flashcards.json.bak)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
