#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "${CHROME_BIN:-}" ]]; then
  browser="$CHROME_BIN"
elif command -v google-chrome >/dev/null 2>&1; then
  browser="$(command -v google-chrome)"
elif command -v chromium >/dev/null 2>&1; then
  browser="$(command -v chromium)"
elif command -v chromium-browser >/dev/null 2>&1; then
  browser="$(command -v chromium-browser)"
else
  echo "No Chrome/Chromium binary found. Set CHROME_BIN and retry." >&2
  exit 2
fi

out="$(mktemp)"
err="$(mktemp)"
server_log="$(mktemp)"
server_pid=""
cleanup() {
  [[ -n "$server_pid" ]] && kill "$server_pid" >/dev/null 2>&1 || true
  rm -f "$out" "$err" "$server_log"
}
trap cleanup EXIT

url="file://$PWD/tests/dom-harness.html"

# Prefer localhost over file:// because enterprise/browser policies often restrict
# file URL behavior. Python is optional; fall back to file:// when unavailable.
if command -v python3 >/dev/null 2>&1; then
  port="$(python3 - <<'PY'
import socket
s=socket.socket(); s.bind(('127.0.0.1',0)); print(s.getsockname()[1]); s.close()
PY
)"
  python3 -m http.server "$port" --bind 127.0.0.1 >"$server_log" 2>&1 &
  server_pid=$!
  for _ in $(seq 1 40); do
    if python3 - <<PY >/dev/null 2>&1
import urllib.request
urllib.request.urlopen('http://127.0.0.1:$port/tests/dom-harness.html', timeout=.2).read(16)
PY
    then
      url="http://127.0.0.1:$port/tests/dom-harness.html"
      break
    fi
    sleep .05
  done
fi

args=(
  --headless=new
  --no-sandbox
  --disable-gpu
  --disable-dev-shm-usage
  --disable-background-networking
  --virtual-time-budget=5000
  --dump-dom
  "$url"
)

# Protect CI/dev shells from a broken local headless-browser setup.
if command -v timeout >/dev/null 2>&1; then
  timeout 25s "$browser" "${args[@]}" >"$out" 2>"$err" || true
else
  "$browser" "${args[@]}" >"$out" 2>"$err" || true
fi

if grep -q '<pre id="results">PASS</pre>' "$out"; then
  echo "Synthetic ChatGPT DOM harness: OK"
  exit 0
fi

echo "Synthetic DOM harness did not pass ($url)." >&2
grep -o '<pre id="results">[^<]*</pre>' "$out" >&2 || true
if [[ ! -s "$out" ]]; then
  echo "Browser produced no DOM output; this usually means the local headless browser itself failed before the fixture ran." >&2
fi
if [[ -s "$err" ]]; then
  echo "Browser stderr (tail):" >&2
  tail -30 "$err" >&2
fi
exit 1
