---
name: html-files
description: Author HTML files in a card repository — two-file pairing, sidecar schema, inline CSS styling, and the cards html check gate.
---

<placeholder-variables>
[CARD_REPO_PATH] — Absolute path to the card's git repository (the `repositoryPath` field from `card` output, or the `$CARD_REPO_PATH` environment variable)
</placeholder-variables>

# HTML Files in a Card

Drop interactive HTML pages anywhere in a card repository except under `attachments/`. They appear as expandable rows in the card-detail timeline, rendered in sandboxed iframes at the declared aspect ratio.

## Two-file pairing

Every HTML file requires a same-basename sidecar next to it. Both files must be committed together:

```
docs/architecture-overview.html
docs/architecture-overview.meta.json
```

An orphan `.html` without its `.meta.json`, or a `.meta.json` without its `.html`, is rejected by the pre-commit hook.

## Sidecar schema

[`<name>.meta.json`](./public/packages/sdk/src/protocol/types/html.ts) is a closed schema — unknown keys are rejected.

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `title` | string | yes | ≤ 120 characters |
| `summary` | string | yes | ≤ 280 characters |
| `aspect` | string \| number | yes | `"<w>:<h>"` (e.g. `"16:9"`) or a positive finite number (e.g. `1.7778`) |
| `scripts` | boolean | no | default `true`; `false` disables scripts entirely |

Example:

```json
{
  "title": "Architecture Overview",
  "summary": "Interactive diagram of the service mesh.",
  "aspect": "16:9"
}
```

## Styling

Write plain CSS yourself. No CSS framework is compiled in — an unstyled page renders unstyled. Put it in an inline `<style>` block:

```html
<style>
  .cta { border-radius: 6px; background: #2563eb; color: #fff; padding: 8px 16px; }
</style>
<button class="cta">Submit</button>
```

A separate stylesheet must be embedded as a `data:` URI like any other asset —
`<link rel="stylesheet" href="data:text/css;base64,…">`. A relative path or
external URL is rejected (see *Inline assets only*).

## Inline assets only

External URLs (`https://`, `http://`, `//`) and relative paths are both forbidden.
The render-time CSP only allows `data:` sources, so a relative path would fail to
load silently in the iframe — the commit-time check catches this before it ships:
it rejects any `src`/`href`/`url()` value that isn't a `data:` URI or a
same-document fragment (`#id`). Use `data:` URIs for every image, font, and
binary asset — including stylesheets.

## Scripts, nonces, and the CSP

The iframe runs under a real Content-Security-Policy injected at render time
(`default-src 'none'; connect-src 'none'; img-src data:`, plus a per-panel
`script-src 'nonce-…'`). The CSP is a genuine runtime boundary — but it confines
the network, not the page's own scripts:

- **All JavaScript in the file you commit runs, and the page is trusted.** With
  `scripts` omitted or `true`, the builder stamps the per-panel nonce onto
  **every** static `<script>` in the file — there is no "builder vs. author"
  distinction, so whatever script you write *or paste* executes. The sandbox is
  `allow-scripts` only — `allow-same-origin` is deliberately withheld, so that
  script cannot reach the parent webview's origin even though it runs. Do
  **not** paste untrusted third-party `<script>` you don't intend to run.
- **The CSP blocks the network and runtime-injected scripts.** `default-src
  'none'` / `connect-src 'none'` mean no `fetch`, beacon, or external asset load
  at runtime — assets must be inline or `data:`. A script injected at runtime
  (e.g. `document.createElement('script')`) carries no nonce and is blocked, as
  are inline event handlers and `eval`.
- **`"scripts": false` is the only way to disable JavaScript.** It drops
  `allow-scripts` from the sandbox entirely — no script runs at all. Use it for
  any page that should not execute JavaScript.

External resources are enforced by the same CSP at runtime (see *Inline assets
only* above); the commit-time URL check is an early author convenience, not the
security boundary.

## Checking before commit

Run the checker before staging:

```bash
cards html check [CARD_REPO_PATH]/docs/architecture-overview.html
```

Or check every HTML file in the card repo:

```bash
cards html check
```

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | Content failure — fix the HTML or sidecar |

The pre-commit hook runs the same checks automatically on every staged HTML file and sidecar.

## Well-formedness check — what it catches

The checker runs the source through the HTML5 parser (parse5) and rejects only
genuine structural failures — truncated or broken-EOF markup such as an
unterminated tag (`<div` with no `>`) or an unclosed `<script>`. It does **not**
catch every mis-nesting: the HTML5 parser auto-closes many unclosed or
mis-ordered tags (`<li>` without `</li>`, mis-nested inline elements) and those
pass. Verify your structure yourself; a clean check means "not truncated," not
"perfectly nested."
