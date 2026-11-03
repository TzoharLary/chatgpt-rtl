# Idle performance and regression checks

## Release candidate check (2026-11-03)

Chrome 156 reloaded the unpacked extension and displayed version 0.6.6. The
previously affected authenticated conversation was reopened and refreshed.
Two idle traces attributed no sampled time to the tracked scan and observer
functions. The renderer also had two tasks totalling 2067.7 ms and one task
of 2394.7 ms respectively. These tasks are page-wide observations and are not
attributed to this extension by those measurements.

One RTL → LTR → RTL toggle pair returned the expected modes. A Hebrew prose
element computed as RTL and a technical element computed as LTR. In a separate
activity recording, `closest` had 138.9 ms sampled self time and
`flushContentQueue` had 35.9 ms sampled inclusive time. Five page-wide long
tasks totalled 1917.2 ms. These are individual samples rather than process CPU
percentages or a controlled comparison with the earlier toggle trace.

A separate demonstration prompt produced a response, but the CLI timed out
while stopping the streaming trace. The gzip file was written, yet the recording
window and continuous response updates were not independently verified, so
this is not a validated live streaming performance result. The automated
packaged-extension test exercises incremental synthetic updates and idle
convergence. It does not replace a verified trace of a live response.

The content observer batches changes, including `dir` changes. Setting an already
unchanged `dir` still produces an attribute mutation in Chrome. Repeating that
write while scanning can therefore feed the observer indefinitely. The scanner
now checks attribute values and inline style values and priorities before writing.
It also avoids removing absent inline properties.

Rich editors are controlled by the page. Scanning or marking their descendants
can cause the editor to reconcile its DOM, producing further mutations. Content
queueing excludes editable descendants, and full scans do not mark technical or
link elements inside editors. Composer identification, placement and its mode
styling remain active. The DOM harness exercises idle convergence, large streamed
turns, partial changes, navigation, editor content and existing bidi behavior.

Run the automated checks with `./scripts/validate.sh`, `./scripts/test-dom.sh`,
and `python3 tests/test-analyze-perf-trace.py`.
For a short live measurement, explicitly connect Chrome DevTools CLI to the
intended Chrome profile, verify the page ID and conversation, then run:

```sh
./scripts/record-perf-trace.sh PAGE_ID /private/tmp/rtl-trace.json.gz 10 /private/tmp/conversation-url.txt
python3 scripts/analyze-perf-trace.py /private/tmp/rtl-trace.json.gz --pid RENDERER_PID
```

Save the exact conversation URL in the private URL file (mode 600). The script
checks that the existing daemon is running and the page ID still matches that
URL. It does not navigate or reload. Identify the current renderer
PID from the trace metadata; it may change on navigation or restart. The analyzer
reports sampled CPU attribution and Chrome main-thread `RunTask` events of at
least 50 ms. Inclusive samples overlap and sampling is an estimate, not process
CPU percentage or a function-call count. Profile and memory values depend on
page state, draft contents, other extensions, and browser activity. Compare the
same conversation and similar idle windows before drawing conclusions.

Traces may contain conversation URLs and page data. Save them outside the
repository with restricted permissions, and do not commit them. No content or
trace files are sent by these scripts.

## Observed regression (2026-11-01)

On an authenticated, previously problematic conversation in Chrome 156, two
idle traces of about 10 seconds each attributed approximately 8.7–9.5 seconds
of sampled time to `scanAdded` (inclusive), and 4.7–4.9 seconds of self time to
`closest`. A first fix that made writes idempotent passed the synthetic check,
but the live trace still showed the loop. Inspection then showed repeated
child-list replacements in a rich composer, with technical and link markers
being written into its contents. Excluding editors from content marking and
queueing eliminated sampled `scanAdded` activity in two subsequent idle traces
on the same conversation. These are sampled timings, not invocation counts.

The original extension was then reloaded from the working tree, and its loaded
`core.js` and `ui.js` were verified against the local files. This validation
covered an RTL → LTR → RTL toggle and selected computed directions in the same
conversation. It did not measure an actual response stream or every possible
ChatGPT layout in the live account. The synthetic harness covers streaming,
partial edits, tables, code, math, replacement and navigation scenarios.

## Incremental scan and queue follow-up (2026-11-01)

A short profile on the same conversation found that direction toggles could
queue many independently changed prose elements. The prior queue reduction
compared each element with every other element; a synthetic burst of 80 sibling
updates caused 6,320 `contains` calls. The queue now checks the ancestor chain
against a set of queued elements. A regression test bounds the comparisons.

A second test changes one paragraph in an 80-paragraph message. The previous
incremental scan made 328 `closest` calls in this fixture because it revisited
the message's other paragraphs. The updated scan revisits the changed subtree,
its enclosing prose, direct-text message root, and relevant table cell. A separate local fixture changing
one paragraph in a 100-paragraph message dropped from 408 to 10 `closest` calls.
Full scans also use a scan-local set to avoid revisiting the same prose element;
a 100-paragraph fixture dropped from 1,607 to 707 `closest` calls. These are
operation counts in synthetic fixtures, not timing or live call counts.

On the authenticated conversation, a trace of the intermediate version still
sampled approximately 1.95 s inside `flushContentQueue` during a toggle pair;
a later trace with the final queue and direct-text fixes sampled about 46 ms. These are single observations
with page state and background activity varying. After the subsequent
direct-text fix, an eight-second idle trace sampled about 4 ms in `scanAdded`
and 4.3 ms in `flushContentQueue`; other page activity still caused long tasks. No claim of a universal speedup or
absence of memory leaks follows from these short traces. Live streaming was not
performed; nested prose, table cells, RTL/LTR changes and update bursts were
covered in the synthetic DOM harness.


## Follow-up: full-scan costs and measurement limits (2026-11-01)

A full scan used to perform the editor check even for elements already visited
in the same scan, and the direct-text fallback checked exclusions before
rejecting elements without direct text. Moving those checks behind inexpensive
filters reduced `closest` calls in a 100-paragraph synthetic full scan from 707
to 404. The larger comparison with the original scanner (1,607 calls) is recorded
above. These counts are fixture-specific, not a universal performance score.

On the authenticated conversation, a profiled RTL/LTR pair took 130–165 ms per
click before this follow-up, 261–271 ms in an intermediate run, and about 81 ms
per click in the final run. Each was a single toggle pair, with roughly 145
marked elements; background activity varied. Google Input Tools contributed
about 0.9 s and 2.6 s of sampled self time in the first and intermediate trace
windows. These observations suggest improvement in the final run but do not
establish a reproducible or universal latency guarantee. Both directions,
composer and technical content were checked after reloading the final code.
A five-second independent observer saw no DOM mutation callbacks or Long Tasks
after stabilization, which is not proof that every idle window is quiet.

A short page-load trace and CDP heap-size metrics were also captured. They have
no equivalent pre-change load baseline and the heap samples are not a leak test.
Heap snapshots and a live response stream were not collected; Chrome's real
session and the test machine's cooling constraints were preserved.

Trace analysis groups CPU nodes per profile ID, because multiple profiles can
reuse the same node IDs. The corresponding regression test prevents mixing
samples from separate profiles. Only an explicitly verified page is recorded;
all traces and conversation identifiers remain outside the repository.

## Composer placement audit (2026-11-01)

The placement routine used to search for dictation, Send, Stop and trailing
controls on every run even if a higher-priority control had already been found.
It now searches fallbacks only as needed, preserving the same priority order.
In a headless fixture with a matching dictation control, one focus-triggered
placement used 12 versus 4 `querySelectorAll` calls, 6 versus 5 geometry reads,
and 3 versus 0 regular-expression tests. These counts include the fixture's
page activity and are not a live time or memory benchmark.

Three focus/blur cycles on the same authenticated conversation were traced
before and after; the sampled CPU profile contained no frames from this
extension in either recording. Therefore these traces do not establish a live
latency improvement or prove those functions never ran. Chrome's forced-reflow
insight reported no problem in both windows. No heap-snapshot comparison or
allocation profile was performed, so neither a leak nor its absence was inferred.
The DOM harness checks both the preferred-anchor short circuit and fallback
placement after preferred controls are removed.
