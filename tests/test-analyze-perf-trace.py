#!/usr/bin/env python3
"""Verify independent CDP CPU profiles cannot overwrite each other's nodes."""
import json
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def chunk(profile_id, name, duration):
    return {'name': 'ProfileChunk', 'pid': 123, 'id': profile_id,
            'args': {'data': {'cpuProfile': {'nodes': [
                {'id': 1, 'callFrame': {'functionName': name}}], 'samples': [1]},
                'timeDeltas': [duration]}}}
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / 'trace.json'
    path.write_text(json.dumps({'traceEvents': [chunk('one', 'markText', 1000),
                                                   chunk('two', 'closest', 2000)]}))
    result = subprocess.run(['python3', str(root / 'scripts/analyze-perf-trace.py'), str(path), '--pid', '123'],
                            check=True, capture_output=True, text=True)
    values = json.loads(result.stdout)['sampled_self_ms']
    assert values.get('markText') == 1 and values.get('closest') == 2, values
print('Trace profile isolation: OK')
