# Validation record — 2026-10-07, version 0.6.2

## Scope and evidence

The user supplied two screenshots showing missing visible spaces at English/Hebrew
boundaries and reordered English fragments around bold `be given`. The matching
authenticated ChatGPT conversation was inspected read-only. Its ordinary inline
`span` elements had extension-generated direction markers and `unicode-bidi:
isolate`, confirming the extension-side cause. The correctly rendered English
example `Dieticians recommend that growing children be given vitamins.` was
retained as valid behavior.

The regression fixtures reproduce the relevant live `p`/`span`/`strong`/`bdi`/`br`
structure. No account identifiers, conversation URLs, or private screenshots are
included in the repository.

## Automated checks

- The initial existing DOM harness passed but did not cover the reported markup.
- Adding the live-markup regression produced a failure with the old implementation:
  `English sentence with bold spans must retain I recommend / be given / another chance order`.
- After the fix, `./scripts/validate.sh` and `./scripts/test-dom.sh` passed locally
  using macOS Google Chrome.
- New checks cover word order, final English punctuation, measured source spaces,
  240px wrapping, direct inline streaming updates, and repeated RTL/LTR toggles.
- The existing synthetic cases for code, math, lists, tables, composer replacement,
  Send/Stop transitions, storage, and the toolbar-message path remain in the suite.
- `./scripts/package.sh` produced a version 0.6.2 ZIP. Archive integrity passed,
  and every packaged file matched its local source file.

## Focused authenticated live checks

After the user reloaded the installed extension and the conversation was refreshed:

- `I recommend that he be given another chance.` displayed in the correct order
  with its period at the English sentence end. Its DOM text contained no added RLM.
- Spaces were visible in `growing children =` followed by its Hebrew translation
  and in `given = סביל`.
- Ordinary inline spans in these paragraphs had no extension prose markers.
- The bilingual example paragraph used the targeted `plaintext` rule; ordinary
  prose continued to use `isolate`.
- Clicking the on-page toggle switched to LTR and back to RTL.
- The captured page console returned no warnings or errors during these checks.

## Limits and packaging

Narrow wrapping and streaming were verified in the synthetic harness. The live
checks above did not cover a full light/dark, Projects/shared-chat, retry/edit,
SPA navigation, or live code/math/table checklist. The real browser-toolbar action
was not clicked; its message path was tested synthetically. Store-policy review
and store submission were outside this task. This record does not declare general
production readiness.

The manifest still requests only `storage`. `PRIVACY.md` was checked against the
implementation: no telemetry, remote code, or conversation transmission was added.
The generated `chatgpt-rtl.zip` remains an ignored build artifact and can be
recreated with `./scripts/package.sh`.
