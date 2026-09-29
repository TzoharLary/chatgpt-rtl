#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import json
import struct
from pathlib import Path

manifest = json.loads(Path('manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['name'] == 'ChatGPT RTL'
assert len(manifest['description']) <= 132
assert manifest['permissions'] == ['storage'], manifest['permissions']
assert 'host_permissions' not in manifest, 'unexpected host_permissions declaration'
assert set(manifest['content_scripts'][0]['matches']) == {'https://chatgpt.com/*', 'https://chat.openai.com/*'}
assert manifest['background']['service_worker'] == 'background.js'

required = [
    'background.js', 'core.js', 'ui.js', 'styles.css',
    'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
    'README.md', 'AGENTS.md', 'RESEARCH.md', 'CHANGELOG.md', 'PRIVACY.md', 'STORE_LISTING.md', 'LICENSE'
]
for path in required:
    assert Path(path).exists(), f'missing {path}'

def png_size(path):
    data = Path(path).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'{path} is not PNG'
    assert data[12:16] == b'IHDR', f'{path} missing IHDR'
    return struct.unpack('>II', data[16:24])

for size in (16, 48, 128):
    actual = png_size(f'icons/icon{size}.png')
    assert actual == (size, size), (size, actual)

# Production code must not fetch or import remote code.
for path in ('background.js', 'core.js', 'ui.js', 'styles.css'):
    text = Path(path).read_text()
    assert 'http://' not in text and 'https://' not in text, f'remote URL in production file: {path}'

# Guard the current ChatGPT contracts and the architecture choices that make the
# extension resilient. These are intentionally semantic selectors/markers rather
# than generated class names.
content = Path('core.js').read_text() + '\n' + Path('ui.js').read_text()
styles = Path('styles.css').read_text()
required_content_signals = [
    'form[data-chatgpt-composer]',
    '[data-composer-markdown][contenteditable="true"]',
    '[data-testid="composer-trailing-actions"]',
    '[data-turn="user"]',
    '[data-turn="assistant"]',
    '[data-turn-key]',
    '[data-user-message-bubble] .whitespace-pre-wrap',
    '[data-markdown-text-style="assistant-message"]',
    'data-chatgpt-rtl-text',
    'data-chatgpt-rtl-list',
    'data-chatgpt-rtl-technical',
    'data-chatgpt-rtl-table',
    'data-chatgpt-rtl-island',
    'MutationObserver',
    'characterData: true',
]
for signal in required_content_signals:
    assert signal in content, f'missing runtime resilience signal: {signal}'

required_style_signals = [
    '[data-chatgpt-rtl-mode="rtl"]',
    '[data-chatgpt-rtl-mode="ltr"]',
    '[data-chatgpt-rtl-text="1"]',
    '[data-chatgpt-rtl-list="1"]',
    '[data-chatgpt-rtl-technical="1"]',
    '[data-chatgpt-rtl-table="1"]',
    '[data-chatgpt-rtl-island="1"]',
    'unicode-bidi: isolate',
    'unicode-bidi: plaintext',
]
for signal in required_style_signals:
    assert signal in styles, f'missing RTL/LTR style signal: {signal}'

for forbidden_permission in ('tabs', 'scripting', 'activeTab'):
    assert forbidden_permission not in manifest.get('permissions', []), f'unexpected broad permission: {forbidden_permission}'

print('manifest/files/icons/privacy/current-DOM surface: OK')
PY

node --check core.js
node --check ui.js
node --check background.js
echo "JavaScript syntax: OK"

echo "Static validation complete. Run ./scripts/test-dom.sh and the live checklist in AGENTS.md before publishing."
