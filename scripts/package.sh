#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/validate.sh
rm -f chatgpt-rtl.zip
zip -q chatgpt-rtl.zip \
  manifest.json background.js core.js ui.js styles.css \
  icons/icon16.png icons/icon48.png icons/icon128.png \
  LICENSE PRIVACY.md

printf 'Created %s/chatgpt-rtl.zip\n' "$PWD"
