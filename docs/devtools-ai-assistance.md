# Reviewing the extension with DevTools AI

The extension runs two content scripts together, in the order in `manifest.json`:
`core.js` provides selectors and DOM scanning, while `ui.js` owns the
MutationObserver, content queue, composer placement, state and navigation.
`styles.css` controls presentation and `background.js` handles the toolbar action.
A judgment based on only one file cannot establish the behavior of the whole
extension. The comment at the start of `core.js` points to the other script,
but it does not automatically grant an assistant access to its contents.

In DevTools Sources, select a file to set the AI conversation context. In the
same conversation, select `ui.js` when asking about observer and placement
behavior; verify the selected file in the context chip. To ensure the assistant
has both files simultaneously, copy the relevant sections into the prompt and
label each with its filename. DevTools can also use a selected Performance trace
entry or insight as context. Check what data it actually analyzed before relying
on a finding.

Example prompt:

> This extension loads `core.js` and `ui.js` together. Review both files and
> `manifest.json` before drawing conclusions about observer behavior, caching,
> composer placement or performance. Distinguish observations in the code from
> performance claims demonstrated by the selected trace. If a file or trace
> is unavailable, say so. Do not infer a numeric score, memory leak or layout
> thrashing without measurements. Explain candidate fixes, risks and tests.

See the official [Chrome DevTools AI assistance documentation](https://developer.chrome.com/docs/devtools/ai-assistance/chat)
and [performance validation notes](./performance.md). Do not paste private
conversation content or traces unless you intend to share them with the AI tool.
