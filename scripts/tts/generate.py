"""Generate lesson audio, one file per article section.

Run with the venv of the engine for that language (the engines live outside the repo):

    ~/projects/tts-lab/vieneu/.venv/bin/python scripts/tts/generate.py --lang vi --group it-fundamentals
    ~/projects/tts-lab/pocket/.venv/bin/python scripts/tts/generate.py --lang en --group it-fundamentals

Sections whose spoken text and voice are unchanged are skipped, so an interrupted
run can simply be started again.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from speakable import speakable, split_sections  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
CONTENT = REPO / "knowledge-content"
OUTPUT = REPO / "public" / "lesson-audio"
LAB = Path(os.environ.get("TTS_LAB", Path.home() / "projects" / "tts-lab"))

ARTICLES = {"vi": "article.md", "en": "article.en.md"}
REFERENCES = {"vi": LAB / "refs" / "me-vi-short.wav", "en": LAB / "refs" / "me-en.wav"}
BITRATE = 32000


def load_vieneu(reference):
    from vieneu import Vieneu

    tts = Vieneu()

    def synthesize(text, wav_path):
        audio = tts.infer(text, ref_audio=str(reference))
        tts.save(audio, wav_path)

        return len(audio) / tts.sample_rate

    return synthesize


def load_pocket(reference):
    import soundfile as sf
    from pocket_tts import TTSModel

    model = TTSModel.load_model()
    voice = model.get_state_for_audio_prompt(str(reference))

    def synthesize(text, wav_path):
        audio = model.generate_audio(voice, text).numpy()
        sf.write(wav_path, audio, model.sample_rate)

        return len(audio) / model.sample_rate

    return synthesize


ENGINES = {"vi": ("vieneu", load_vieneu), "en": ("pocket", load_pocket)}


def topics(group, slugs):
    found = []

    for meta_path in sorted(CONTENT.glob("*/meta.json")):
        slug = meta_path.parent.name
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        if slug in slugs or (group and meta.get("group") == group):
            found.append((meta.get("order", 0), slug))

    return [slug for _, slug in sorted(found)]


def write_json(path, data):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def encode(wav_path, target):
    subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", str(BITRATE), str(wav_path), str(target)],
        check=True,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--lang", choices=ARTICLES, required=True)
    parser.add_argument("--group")
    parser.add_argument("--topic", action="append", default=[])
    parser.add_argument("--dry-run", action="store_true", help="print the spoken text only")
    args = parser.parse_args()

    selected = topics(args.group, args.topic)

    if not selected:
        parser.error("no topics matched --group / --topic")

    lang = args.lang
    engine, load = ENGINES[lang]
    reference = REFERENCES[lang]
    synthesize = None
    voice_id = None

    if not args.dry_run:
        voice_id = hashlib.sha256(reference.read_bytes()).hexdigest()[:12]

    for slug in selected:
        article = CONTENT / slug / ARTICLES[lang]

        if not article.exists():
            continue

        folder = OUTPUT / slug
        manifest_path = folder / f"{lang}.json"
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"sections": {}}

        for number, section in enumerate(split_sections(article.read_text(encoding="utf-8")), 1):
            text = speakable(section, lang)

            if args.dry_run:
                print(f"\n=== {slug} · section {number} ===\n{text}")
                continue

            if not text:
                continue

            digest = hashlib.sha256(f"{engine}|{voice_id}|{text}".encode()).hexdigest()[:10]
            name = f"{lang}-s{number:02d}-{digest}.m4a"
            target = folder / name

            if target.exists() and manifest["sections"].get(str(number), {}).get("file") == name:
                continue

            if synthesize is None:
                synthesize = load(reference)

            folder.mkdir(parents=True, exist_ok=True)

            with tempfile.TemporaryDirectory() as scratch:
                wav_path = Path(scratch) / "section.wav"
                seconds = synthesize(text, wav_path)
                encode(wav_path, target)

            previous = manifest["sections"].get(str(number), {}).get("file")
            manifest["sections"][str(number)] = {"file": name, "seconds": round(seconds, 1)}
            write_json(manifest_path, manifest)

            if previous and previous != name:
                (folder / previous).unlink(missing_ok=True)

            print(f"{slug} {lang} section {number}: {seconds:.0f}s", flush=True)


if __name__ == "__main__":
    main()
