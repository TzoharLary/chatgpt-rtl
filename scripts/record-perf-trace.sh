#!/usr/bin/env bash
# Record an already-open, verified page without navigation or reload.
set -euo pipefail
if [[ $# -ne 4 || ! "$1" =~ ^[0-9]+$ || ! "$3" =~ ^[0-9]+$ || "$3" -lt 1 || "$3" -gt 15 ]]; then
  echo "Usage: $0 PAGE_ID /absolute/private/output.json.gz SECONDS(1-15) /private/expected-url.txt" >&2
  exit 2
fi
page="$1"; output="$2"; seconds="$3"; expected_url_file="$4"
[[ "$output" = /* && "$output" = *.json.gz ]] || { echo "Use an absolute .json.gz path outside the repository." >&2; exit 2; }
repo="$(cd "$(dirname "$0")/.." && pwd -P)"
parent="$(cd "$(dirname "$output")" && pwd -P)"
case "$parent/" in "$repo/"*) echo "Trace must be outside the repository." >&2; exit 2;; esac
umask 077
log="$(mktemp)"
pages="$(mktemp)"
trap 'rm -f "$log" "$pages"' EXIT
# Never let the CLI silently start an isolated browser when no daemon exists.
chrome-devtools status | grep -q 'daemon is running' || { echo "Connect the CLI to the intended Chrome profile first." >&2; exit 1; }
chrome-devtools list_pages --output-format=json >"$pages"
node - "$pages" "$page" "$expected_url_file" <<'JS'
const fs = require('fs');
try {
  const pages = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).pages;
  const target = pages.find(p => String(p.id) === process.argv[3]);
  const expected = fs.readFileSync(process.argv[4], 'utf8').trim();
  if (!expected || !target || target.url !== expected) throw Error('Page does not match the saved conversation URL');
} catch (error) { console.error(error.message); process.exit(1); }
JS
chrome-devtools performance_start_trace "$page" --no-reload --no-autoStop >"$log" 2>&1
sleep "$seconds"
chrome-devtools performance_stop_trace "$page" --filePath "$output" >"$log" 2>&1 || { echo "Trace could not be saved." >&2; exit 1; }
chmod 600 "$output"
echo "Saved private trace to $output"
