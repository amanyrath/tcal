#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.vercel/cache/events/.vercel/python/.venv"

if [[ ! -x "$VENV/bin/pip" ]]; then
  echo "Vercel Python venv not found. Run 'vercel dev' once, then rerun this script."
  exit 1
fi

"$VENV/bin/pip" install -e "$ROOT"
echo "Linked local touchstonecal into Vercel dev Python env."
