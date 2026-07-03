# Plan: SerovalScope — a DevTools extension to decode TanStack Start RPC payloads

## Context

TanStack Start's server functions (`createServerFn`) talk to the browser over
an RPC bridge at `/_serverFn/<hash>`. Both the request (a `?payload=` query
string on GET calls, or a JSON body on POST) and the response body are
encoded in a compact tag-based wire format, not plain JSON — e.g. a response
looks like `{"t":10,"i":0,"p":{"k":["result","error","context"],"v":[...]}}`.
This is unreadable in Chrome DevTools' Network tab while debugging
subpilot-web (or any other TanStack Start app). The goal is a browser
extension that shows the real, human-readable value instead.

The original framing was "a button in the Network tab" — confirmed below
that this specific UI isn't achievable via any documented extension API, so
the actual deliverable is a custom DevTools panel that captures and decodes
matching requests, which is the closest real equivalent to what was asked
for.

## Confirmed technical findings (verified directly against source, not assumed)

**The wire format is `seroval` v1.5.4** (github.com/lxsmnsyc/seroval, MIT), a
direct dependency of `@tanstack/start-client-core` and
`@tanstack/start-server-core`. Verified by reading the actual installed
package in subpilot-web's `node_modules` and the real TanStack Start source
that calls it — not by inference from the payload shape alone.

Critically, **request and response use two different seroval modes**,
confirmed via the exact import line in
`@tanstack/start-server-core/dist/esm/server-functions-handler.js`:

```js
import { fromJSON, toCrossJSONAsync, toCrossJSONStream } from "seroval";
```

- **Request payload** (`?payload=` query param, or POST body): seroval's
  "tree/JSON" mode. Decode with `fromJSON(JSON.parse(raw), { plugins })`.
- **Response body**: seroval's "Cross" mode (`SerovalNode` — the
  `{t,i,p,k,v,a,s,o}` shape actually seen in the network tab). Decode with
  `fromCrossJSON(JSON.parse(raw), { refs: new Map(), plugins })` — a fresh
  `refs` Map is required per call, used for resolving `i`-indexed
  shared/circular references within one payload.
- Both need a `plugins` array for full fidelity on Start-specific types
  beyond seroval's built-in support (Date/Map/Set/RegExp/Error/BigInt/Promise
  need no plugins at all). `@tanstack/start-client-core` exports
  `getDefaultSerovalPlugins()` as a public, top-level function — import it
  directly rather than hand-copying a plugin list that would drift from the
  real one.
- **Detecting whether a response was actually seroval-encoded**: every
  seroval-encoded response (success, streaming, and thrown-error paths) sets
  a real header, confirmed by reading `constants.js` in
  `@tanstack/start-client-core`: `x-tss-serialized: true` (lowercase). A
  `notFound()` response or a raw pass-through `Response` from a server
  function does _not_ set it — check this before attempting to decode, so a
  plain/raw response is shown as-is instead of erroring.
- **Streaming is out of scope for v1**: TanStack Start only switches to its
  NDJSON/binary-frame multiplexed protocol
  (`frame-protocol.js`,`TSS_CONTENT_TYPE_FRAMED_VERSIONED`) when a server
  function actually returns a `ReadableStream`. Ordinary JSON-returning
  calls — the overwhelming majority, including every example seen so far —
  hit the plain `done && rawStreams.size === 0` branch and return one flat
  `JSON.stringify(nonStreamingBody)` body. Build for that case only; treat
  framed/streaming decode as an explicit future enhancement.
- **FormData requests** (`multipart/form-data` /
  `application/x-www-form-urlencoded`) don't populate `?payload=` the same
  way — skip decoding attempts for these, show "form submission (not decoded
  in v1)".

**Chrome DevTools extension architecture constraint**, confirmed against the
official Chrome for Developers API reference (not training-data assumption):
there is **no documented API to inject UI into the native Network panel's
per-request inspector**. `createSidebarPane()` exists only on
`chrome.devtools.panels.elements` and `.sources` — there is no
`chrome.devtools.panels.network`. `chrome.devtools.panels.create(...)`
creates an entirely separate, new top-level custom panel tab, which is the
only viable architecture here.

- Capture via `chrome.devtools.network.onRequestFinished.addListener(...)`;
  read the response body via the async `request.getContent((body, encoding)
=> ...)` method on the captured entry. No built-in URL filtering — filter
  manually on `request.request.url`.
- Timing gotcha: only requests that happen _after_ the Network panel has
  been opened in that DevTools session are captured — reload the page after
  opening DevTools to catch everything.
- Manifest V3 is required (Chrome MV2 is fully dead as of mid-2026) and
  works identically for `devtools_page`/`devtools.panels`/`devtools.network`
  — none of MV3's other restrictions (service workers,
  `declarativeNetRequest`) affect a devtools panel, since it's just a normal
  extension page.

**Cross-browser**: Firefox's WebExtensions `devtools.panels`/
`devtools.network` are near-1:1 ports of Chrome's (confirmed via MDN, which
states this explicitly), including real HAR-based capture — genuinely not a
weak/stubbed API on Firefox. **WXT** (wxt.dev) is the best-documented,
actively maintained tool for a single codebase targeting Chrome/Firefox/Edge
with an explicit devtools-panel entrypoint and a working official example
(github.com/wxt-dev/examples/tree/main/examples/devtools-extension). Safari's
devtools-extension story is unconfirmed/likely weak and needs Xcode +
notarization — out of scope. For personal use: Chrome/Edge "Load unpacked"
in developer mode is durable and zero-friction indefinitely; Firefox Release
builds refuse to run _any_ unsigned extension persistently, so even
personal-only use requires an unlisted/self-distributed submission to
Mozilla's AMO for signing (usually fast, but a real distinct step Chrome
doesn't need).

## Recommended approach

**Scope for v1: Chrome only, built with WXT from day one.** Not because
Firefox is hard technically (it isn't — see above), but because WXT gives a
Vite dev server with HMR, TypeScript, and a `browser.*`-typed API surface for
free even in a Chrome-only build, which removes most of the actual Firefox
port work later without paying for it now. Skip Firefox signing and
Safari/Edge-specific testing until the Chrome version is genuinely useful
day-to-day.

**Project structure** (WXT, React):

```
serovalscope/
├── entrypoints/
│   ├── devtools.html / devtools.ts   # calls chrome.devtools.panels.create(...) once
│   └── panel.html                    # the actual panel page
├── panel/
│   ├── main.tsx, App.tsx             # React root + two-pane layout
│   ├── capture.ts                    # onRequestFinished wiring + URL filtering
│   ├── deserialize.ts                # decodeRequest / decodeResponse — pure, no chrome.* deps
│   ├── serovalPlugins.ts             # re-exports getDefaultSerovalPlugins()
│   ├── settings.ts                   # persisted URL-pattern filter
│   └── components/
│       ├── Toolbar.tsx, RequestList.tsx, RequestDetail.tsx, JsonTree.tsx
├── deserialize.test.ts               # vitest, real captured fixtures
└── public/icon/*.png
```

No background/service-worker entrypoint is needed: the custom panel page
created by `panels.create()` persists for the life of the DevTools window
(it isn't torn down when switching DevTools tabs), so `capture.ts`'s
listener and all captured-request state can live directly in the panel's own
module scope — no cross-context messaging required. This is simpler than the
common "background listens, panel subscribes via `runtime.onMessage`"
pattern, which exists mainly for short-lived Elements-panel sidebar panes,
not applicable here.

`deserialize.ts` stays framework/chrome-free (pure functions: raw string in,
decoded value or error out) so it's testable in plain `vitest` against
hand-captured fixtures with zero browser harness, and portable unchanged to
a future Firefox build.

**Panel UI**: two-pane layout mirroring the Network tab for familiarity —
left: a virtualized, Network-tab-style request list (time / method / status
/ decode-status dot) filtered to the configured URL pattern (default
`_serverFn/`, editable in the toolbar, persisted via WXT's storage helper);
right: the selected request's Request and Response sections, each with a
**Decoded | Raw** toggle and a `react-json-view-lite` tree view (small,
zero-dependency, actively maintained). Not a HAR-tab replica — the real
Network tab already covers headers/timing/cookies one keystroke away, so
keep this panel focused on the one thing it uniquely does: showing the
decoded value.

**Error handling**: decode failures (unrecognized plugin type, non-seroval
payload) are caught inside `decodeRequest`/`decodeResponse`, never thrown —
show a small inline banner plus the raw parsed JSON, auto-select the Raw
tab, mark the row's status dot yellow. Wrap the tree-rendering component in
a React error boundary scoped to just that pane so one bad payload can't
take down the request list. The `onRequestFinished` listener itself never
calls decode — that only happens at render time for the selected row.

## Phased build order

1. **Skeleton**: WXT React template, `devtools.ts` → `panels.create(...)`,
   static "hello" panel page. Confirms manifest wiring end to end before any
   real logic.
2. **Pure `deserialize.ts` + tests** — no browser needed. Prove out the
   `fromJSON` (request) vs `fromCrossJSON` (response) split against the
   example payload from this conversation plus a few hand-captured fixtures
   (copy raw request/response text out of Chrome's real Network tab by hand,
   once, before the extension exists — this is how you bootstrap fixtures).
3. **Capture pipeline**: wire `onRequestFinished` + URL filtering, render
   the raw request list only (no decoding yet) against real subpilot-web
   `pnpm dev` traffic.
4. **Wire decode into the UI**: integrate step 2 into step 3's list, add the
   detail pane with the Decoded/Raw toggle and error-boundary fallback.
5. **Polish**: search box (searches decoded content, not just URL — genuinely
   higher-value than what the real Network tab offers), pause/clear,
   copy-to-clipboard of the decoded value, large-payload depth/size guard on
   the tree view.
6. **Explicitly deferred**: streaming/framed-response decode, Firefox build
   - AMO signing, hash→function-name resolution for nicer row labels.

## Verification

- Steps 1-2 are directly testable now: `vitest run` against
  `deserialize.test.ts`.
- From step 3 onward: `wxt`'s dev mode launches a dedicated Chrome profile
  with the extension pre-loaded; open subpilot-web's `pnpm dev` (port 3000)
  in that profile, open DevTools _before_ navigating (per the researched
  timing gotcha — reload after opening DevTools each session), open the
  custom panel tab, and exercise real dashboard routes that call server
  functions (e.g. `/analytics`, which is exactly where the example payload
  in this conversation came from).
- Confirm the row list captures `/_serverFn/*` traffic, the detail pane
  shows a correctly decoded value matching what the real data actually is
  (cross-check against the dashboard UI rendering the same data), and that
  toggling Raw shows the original wire-format JSON for comparison.

## Note on an alternative architecture (considered, not pursued)

TanStack ships its own in-app devtools plugin system
(`@tanstack/react-devtools`, already a dependency in subpilot-web). A plugin
panel embedded inside the app itself could intercept `fetch` calls to
`/_serverFn/*` at the source and decode them with no Manifest V3/browser/
store concerns at all, at the cost of only working when that plugin is
mounted in a given app. Noted here so the tradeoff isn't silently revisited
later — the browser-extension approach was the explicit ask and remains the
right call for something that should work across any TanStack Start project
being debugged, not just this one.
