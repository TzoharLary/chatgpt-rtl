# Idle performance and regression checks

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

Run the automated checks with `./scripts/validate.sh` and `./scripts/test-dom.sh`.
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
