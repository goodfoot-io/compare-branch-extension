---
name: html-files
description: Author HTML files in a card repository — two-file pairing, sidecar schema, Tailwind/daisyUI styling, and the cards html check gate.
---

<placeholder-variables>
[CARD_REPO_PATH] — Absolute path to the card's git repository (the `repositoryPath` field from `card` output, or the `$CARD_REPO_PATH` environment variable)
</placeholder-variables>

# HTML Files in a Card

Drop interactive HTML pages into a card's `html/` directory. They appear as expandable rows in the card-detail timeline, rendered in sandboxed iframes at the declared aspect ratio. Tailwind v4 + daisyUI 5 styles are wired automatically — write classes and they paint.

## Two-file pairing

Every HTML file requires an exact-name sidecar. Both files must be committed together:

```
html/walkthrough.html
html/walkthrough.meta.json
```

An orphan `.html` without its `.meta.json`, or a `.meta.json` without its `.html`, is rejected by the pre-commit hook.

## Sidecar schema

[`html/<name>.meta.json`](./public/packages/sdk/src/protocol/types/html.ts) is a closed schema — unknown keys are rejected.

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

## Tailwind v4 + daisyUI 5

No per-card setup. Write daisyUI component classes (`btn`, `card`, `badge`, …) and Tailwind utility classes directly in the HTML. The build pipeline compiles only the classes that appear in the static source.

## Inline assets only

External URLs (`https://`, `http://`, `//`) and relative paths are both forbidden.
The render-time CSP only allows `img-src data:` — a relative path passes the
commit-time check's syntax but fails to load silently in the iframe. Use `data:`
URIs for every image, font, and binary asset; the commit-time check now rejects
any `src`/`href`/`url()` value that isn't a `data:` URI or a same-document
fragment (`#id`).

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
cards html check [CARD_REPO_PATH]/html/walkthrough.html
```

Or check all files in the directory:

```bash
cards html check [CARD_REPO_PATH]/html/
```

Exit codes:

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | Content failure — fix the HTML or sidecar |
| `2` | Infrastructure failure — Tailwind/daisyUI packages unavailable; reinstall the extension |

The pre-commit hook runs the same checks automatically on every staged `html/**` file.

## Well-formedness check — what it catches

The checker runs the source through the HTML5 parser (parse5) and rejects only
genuine structural failures — truncated or broken-EOF markup such as an
unterminated tag (`<div` with no `>`) or an unclosed `<script>`. It does **not**
catch every mis-nesting: the HTML5 parser auto-closes many unclosed or
mis-ordered tags (`<li>` without `</li>`, mis-nested inline elements) and those
pass. Verify your structure yourself; a clean check means "not truncated," not
"perfectly nested."

## Scanner limitation — no dynamic class concatenation

The Tailwind content scanner reads the **static HTML source** at check time. A class name injected via JavaScript at runtime (string concatenation, template literals, `classList.add(variable)`) may not appear in the compiled CSS even though the page appears to render. The marker-class probe that the checker runs verifies only that the scanner ran and saw the source file — it does not verify that dynamically constructed class names are covered.

Write all class names literally in the HTML source so the scanner can see them:

```html
<!-- Good: scanner sees "btn-primary" -->
<button class="btn btn-primary">Submit</button>

<!-- Bad: scanner misses the class; element may be unstyled -->
<button id="btn">Submit</button>
<script>
  const variant = 'primary';
  document.getElementById('btn').className = `btn btn-${variant}`;
</script>
```
