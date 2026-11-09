# Performance regression checks

Run the same checks used by CI from the repository root. The browser harness
uses Chrome or Chromium, and `CHROME_BIN` can point to a specific browser binary.

```sh
./scripts/validate.sh
./scripts/test-dom.sh
python3 tests/test-analyze-perf-trace.py
```

The browser harness exercises idle convergence, large streamed turns, partial
edits, navigation, and composer placement. It bounds the work in representative
fixtures, including a burst of sibling updates and an edit to one paragraph
inside a long message. Use its results to compare changes on the same fixture.

The content observer batches changes, including `dir` mutations. Compare
attribute and style values before writing to avoid feeding mutations back into
the observer. Keep content marking out of editable descendants so the rich
editor can reconcile its own DOM. Preserve the composer placement priority when
changing how fallback controls are searched.

If you already have a Chrome Performance trace, pass its JSON or gzip file and
the renderer PID to the analyzer.

```sh
python3 scripts/analyze-perf-trace.py /path/to/trace.json.gz --pid RENDERER_PID
```

Find the renderer PID in the trace metadata. It can change on navigation or
restart. The analyzer reports sampled CPU attribution and main-thread tasks of
at least 50 ms. Inclusive samples can overlap. Compare equivalent page states
and time windows. Keep traces containing conversation URLs or page data outside
the repository.
