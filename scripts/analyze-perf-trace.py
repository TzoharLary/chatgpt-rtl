#!/usr/bin/env python3
"""Summarize a Chrome DevTools trace without printing page URLs or content.

Usage: python3 scripts/analyze-perf-trace.py TRACE.json[.gz] --pid RENDERER_PID
CPU sample weights approximate on-CPU attribution; inclusive times overlap.
"""
import argparse
import collections
import gzip
import json

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('trace')
parser.add_argument('--pid', type=int, required=True)
args = parser.parse_args()
open_trace = gzip.open if args.trace.endswith('.gz') else open
with open_trace(args.trace, 'rt') as stream:
    trace = json.load(stream)
events = trace['traceEvents'] if isinstance(trace, dict) else trace
chunks = [e for e in events if e.get('pid') == args.pid and e.get('name') == 'ProfileChunk']
nodes = {}
for chunk in chunks:
    for node in chunk['args']['data']['cpuProfile'].get('nodes', []):
        nodes[node['id']] = node
self_time = collections.Counter()
inclusive = collections.Counter()
for chunk in chunks:
    data = chunk['args']['data']
    for node_id, delta in zip(data['cpuProfile'].get('samples', []), data.get('timeDeltas', [])):
        node = nodes.get(node_id)
        if not node:
            continue
        frame = node.get('callFrame', {})
        self_time[frame.get('functionName', '')] += delta
        names = set()
        while node:
            frame = node.get('callFrame', {})
            name = frame.get('functionName', '')
            if name and (name in ('closest', 'markText', 'markKnownRoot', 'scanAdded', 'flushContentQueue', 'handleMutations', 'excludedText') or 'lhadgcgonibcgpjbboncikhlgonbaijf' in frame.get('url', '')):
                names.add(name)
            node = nodes.get(node.get('parent'))
        for name in names:
            inclusive[name] += delta
main_threads = {e['tid'] for e in events if e.get('pid') == args.pid and e.get('name') == 'thread_name' and e.get('args', {}).get('name') == 'CrRendererMain'}
tasks = [e['dur'] for e in events if e.get('pid') == args.pid and e.get('tid') in main_threads and e.get('name') == 'RunTask' and e.get('dur', 0) >= 50000]
print(json.dumps({'renderer_pid': args.pid, 'samples': sum(len(c['args']['data']['cpuProfile'].get('samples', [])) for c in chunks), 'sampled_self_ms': {k: round(v / 1000, 1) for k, v in self_time.most_common(12)}, 'sampled_inclusive_ms': {k: round(inclusive[k] / 1000, 1) for k in ('closest', 'excludedText', 'markText', 'markKnownRoot', 'scanAdded', 'flushContentQueue', 'handleMutations')}, 'long_tasks_over_50ms': len(tasks), 'long_task_total_ms': round(sum(tasks) / 1000, 1)}, ensure_ascii=False, indent=2))
