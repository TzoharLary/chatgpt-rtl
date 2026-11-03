#!/usr/bin/env python3
"""Build and exercise an exact committed Chrome Web Store candidate."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
if len(sys.argv) != 2 or not Path(sys.argv[1]).is_absolute():
    sys.exit('Usage: ./scripts/preflight-store.sh /absolute/new-output-directory')
output = Path(sys.argv[1]).resolve()
if output == ROOT or ROOT in output.parents:
    sys.exit('Output must be outside the repository')
output.mkdir(mode=0o700, parents=True, exist_ok=False)
os.chmod(output, 0o700)
report = {'commit': None, 'version': None, 'checks': {}, 'live_chrome': 'not_run'}
report_file = output / 'report.json'


def save():
    report_file.write_text(json.dumps(report, indent=2) + '\n')
    report_file.chmod(0o600)


def run(name, command, cwd=ROOT, env=None):
    result = subprocess.run(command, cwd=cwd, env=env, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT)
    (output / f'{name}.log').write_text(result.stdout)
    report['checks'][name] = {'status': 'pass' if result.returncode == 0 else 'fail',
                              'exit_code': result.returncode}
    save()
    if result.returncode:
        sys.exit(f'{name} failed, see {output / (name + ".log")}')


try:
    dirty = subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True)
    if dirty:
        sys.exit('Commit or otherwise resolve working-tree changes before release preflight')
    report['commit'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    report['version'] = json.loads((ROOT / 'manifest.json').read_text())['version']
    save()
    run('static', ['./scripts/validate.sh'])
    run('dom', ['./scripts/test-dom.sh'])
    run('trace_analyzer', ['python3', 'tests/test-analyze-perf-trace.py'])
    run('dependencies', ['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'])
    with tempfile.TemporaryDirectory(prefix='rtl-preflight-') as temp:
        source = Path(temp) / 'source'
        source.mkdir()
        archive = subprocess.run(['git', 'archive', report['commit']], cwd=ROOT,
                                 stdout=subprocess.PIPE, check=True)
        subprocess.run(['tar', '-xf', '-', '-C', str(source)], input=archive.stdout, check=True)
        run('package', ['./scripts/package.sh'], cwd=source)
        package = source / 'chatgpt-rtl.zip'
        extracted = Path(temp) / 'extension'
        extracted.mkdir()
        with zipfile.ZipFile(package) as zipped:
            expected = {'manifest.json', 'background.js', 'core.js', 'ui.js', 'styles.css',
                        'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
                        'LICENSE', 'PRIVACY.md'}
            assert set(zipped.namelist()) == expected, 'Unexpected package contents'
            assert zipped.testzip() is None, 'Invalid package CRC'
            for name in expected:
                assert zipped.read(name) == (source / name).read_bytes(), f'Package mismatch: {name}'
            zipped.extractall(extracted)
        report['checks']['archive'] = {'status': 'pass'}
        target = output / f"chatgpt-rtl-{report['version']}.zip"
        target.write_bytes(package.read_bytes())
        report['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
        env = dict(os.environ, RTL_PACKAGE_DIR=str(extracted), RTL_PACKAGE_VERSION=report['version'])
        run('installed_package', ['npx', 'playwright', 'test', 'tests/store-package.spec.cjs',
                                  '--workers=1', '--retries=0', '--reporter=line'], env=env)
    save()
    print(f'Release checks passed. Report: {report_file}')
except (OSError, subprocess.SubprocessError, AssertionError) as exc:
    report['error'] = str(exc)
    save()
    sys.exit(str(exc))
