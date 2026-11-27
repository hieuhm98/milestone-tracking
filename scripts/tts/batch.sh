#!/bin/bash
# Generate audio topic by topic, both languages, in curriculum order.
# Usage: scripts/tts/batch.sh GROUP [MINUTES]
# No new topic is started once MINUTES (minus a 10 minute margin) has passed.
# Finished sections are skipped, so running it again continues where it stopped.
set -euo pipefail

group="$1"
minutes="${2:-0}"
repo="$(cd "$(dirname "$0")/../.." && pwd)"
lab="${TTS_LAB:-$HOME/projects/tts-lab}"
generate="$repo/scripts/tts/generate.py"

slugs=$(python3 -B - "$repo" "$group" <<'EOF'
import json
import sys
from pathlib import Path

found = []

for path in Path(sys.argv[1], "knowledge-content").glob("*/meta.json"):
    meta = json.loads(path.read_text(encoding="utf-8"))

    if meta.get("group") == sys.argv[2]:
        found.append((meta.get("order", 0), path.parent.name))

print("\n".join(slug for _, slug in sorted(found)))
EOF
)

for slug in $slugs; do
  if (( minutes > 0 && SECONDS >= (minutes - 10) * 60 )); then
    echo "STOP: time budget reached before $slug"
    break
  fi

  echo "TOPIC $slug (${SECONDS}s elapsed)"
  "$lab/vieneu/.venv/bin/python" -B "$generate" --lang vi --topic "$slug" 2>&1 | grep -E " section |Error|Traceback" || true
  "$lab/pocket/.venv/bin/python" -B "$generate" --lang en --topic "$slug" 2>&1 | grep -E " section |Error|Traceback" || true
  echo "DONE $slug (${SECONDS}s elapsed)"
done

echo "FINISHED after ${SECONDS}s"
