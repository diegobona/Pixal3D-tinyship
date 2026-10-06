# Embedded Pixal3D workspace

Reviewed on 2026-10-06. This document covers the active Next.js homepage.

## Rendering and loading

The inline workspace uses `https://victor-pixal3d-studio.hf.space`, configured in `apps/next-app/lib/pixal3d-surface-visibility.ts`. The existing optional free-trial modal uses `/api/hf-pixal3d-instance`, which resolves an available TencentARC Pixal3D instance from the remote pool. Those are separate integration paths; the inline workspace does not call the instance resolver.

Both embed locations render through `libs/react-shared/components/lazy-iframe.tsx`. The component reserves its layout footprint before creating the remote iframe, mounts near the viewport using `IntersectionObserver`, and retains native `loading="lazy"`. Once mounted, scrolling away does not destroy the embedded session. Changing the source or explicitly retrying starts a new iframe lifecycle; leaving the page clears the observer and timer. A no-JavaScript link opens the external workspace directly.

The inline iframe keeps its existing 900px / 940px / 960px responsive height. A lightweight translated brand and source bar sits above the existing iframe body, so the sign-in overlay and source-image helper keep their existing positions relative to that body. The modal keeps its full-height iframe and minimum 520px footprint. Its fullscreen overlay now covers only instance resolution; the shared component owns document-loading and slow-loading help, so retry and external-open controls remain accessible.

The existing sandbox, clipboard permissions, referrer policy, and iframe test IDs are preserved. The homepage remains public, with its existing signed-out UI overlay. That overlay controls the local interface; the external HF Space remains publicly accessible and does not inherit the site's session.

The homepage workspace is above the fold and will usually mount immediately. Lazy loading gives the shared component predictable behavior for offscreen embeds; it does not imply a large reduction in the homepage's initial requests.

## Failure and readiness semantics

The wrapper offers translated placeholders, slow-loading help, a manual retry, and a link to open the workspace separately. The timeout starts after mounting. Retry is explicit because reloading destroys the child page's current upload, settings, or generation state.

An iframe `load` event means that navigation finished from the parent page's perspective. It does not verify that the remote generation service is healthy or ready. Browsers also emit `load` for error documents and do not reliably emit iframe `error` events. Consequently, the wrapper does not claim to detect every HTTP, network, GPU, or provider failure. See [MDN iframe event behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#error_and_load_event_behavior).

## Generation and download analytics

No generation/download counters or event receiver are implemented by this change. No analytics SDK or collector exists in the inspected active Next.js integration.

The user confirmed on 2026-10-06 that this is a third-party Space and they do
not have permission to edit its code. Accurate generation and download counts
therefore remain unavailable for the current iframe integration. The existing
lazy wrapper, branding, tutorial SEO, and internal links are implemented; this
analytics limitation does not mean those parts need to be rebuilt.

The inspected public [Studio frontend source](https://huggingface.co/spaces/victor/pixal3d-studio/raw/main/index.html) uses Gradio Client. Generation calls `/generate_fast`, or `/generate_preview` followed by `/extract`. Its download button opens the current model URL in a new window; that model can come from generation, the default example, or the community gallery. The inspected source has no `postMessage` bridge carrying generation or download events to its embedding page. Repository access does not establish control of the deployed `victor/pixal3d-studio` Space.

A fresh read-only check after that confirmation found both the raw frontend and
the deployed Space responding with HTTP 200 and matching 46,837-character HTML.
Neither contained a `postMessage` bridge. No model was generated or uploaded for
this check.

The parent page cannot inspect a different-origin iframe's DOM, button clicks, or private in-flight requests. `allow-same-origin` preserves the child page's own origin; it does not make the HF page share the Next.js origin. Enabling CORS would not grant parent access to the child's DOM. See [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy).

Useful event definitions for a future cooperating child app are:

| Event | What it measures | What it does not prove |
| --- | --- | --- |
| `generation_started` | A valid generation request was started | A successful model or charged transaction |
| `generation_completed` | A final usable model was returned successfully | An authoritative billing record |
| `model_download_requested` | The user activated download for a valid model | File transfer completion or a file saved on the user's device |

Generation attempts, successful generations, and download requests should remain distinct. Include an asset origin such as `generated`, `example`, or `community` for downloads. Page views, iframe navigation, focus changes, queue size, and trial allocation must not be substituted for these events.

Accurate client interaction counts require editing or obtaining cooperation from the child app, or replacing its controls with a site-owned UI that invokes the provider API. Gradio offers [event callbacks](https://gradio.app/docs/gradio/downloadbutton) and [custom JavaScript](https://gradio.app/guides/custom-CSS-and-JS) inside an app; those capabilities do not automatically expose the existing iframe's events to its parent.

If an event bridge is introduced later, use a versioned schema and explicit `postMessage` target origin. The parent must check the exact child origin, `event.source === iframe.contentWindow`, event names and payload limits, and deduplicate event IDs. With rotating resolver URLs, trust only the exact selected origin for that frame. Any collector must resolve user identity from the server session, rather than accepting a user ID supplied by the child. Client-reported events are telemetry and must not trigger credits, billing, or authoritative generation records. See [MDN postMessage security guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns).

## Verification scope

Browser and E2E verification should cover near-viewport mounting, stable dimensions, loading/retry behavior, locale copy, source links, the sign-in overlay, and the source-image helper's iframe-relative position. Use deterministic external-frame/session fixtures where needed. Do not generate paid or GPU-consuming models, consume trial reservations, or download community files just to verify the wrapper. Typecheck, build, and relevant Next.js E2E outcomes are recorded in `tests/e2e/TEST-CATALOG.md` when the full feature is integrated.
