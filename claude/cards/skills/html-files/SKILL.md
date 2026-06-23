---
name: html-files
description: Author HTML files in a card repository — two-file pairing, sidecar schema, Tailwind/daisyUI styling, and the card html check gate.
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

External URLs (`https://`, `http://`, `//`) are forbidden. The commit-time check
flags them in `src`/`href`/`srcset` attributes and in CSS `url()` / `@import`
references; the runtime CSP blocks any that slip past. Use `data:` URIs for
images, fonts, and binary assets, or reference relative paths within the card repo.

## Scripts, nonces, and the CSP

The iframe runs under a real Content-Security-Policy injected at render time
(`default-src 'none'; connect-src 'none'; img-src data:`, plus a per-panel
`script-src 'nonce-…'`). The nonce is a genuine boundary, not advisory:

- With `scripts` omitted or `true`, the builder stamps its nonce onto the
  `<script>` tags it emits, and those scripts execute. The sandbox is
  `allow-scripts allow-same-origin`.
- A `<script>` that does **not** carry the builder's nonce (e.g. one pasted in
  by hand or injected at runtime) will **not** execute — the CSP blocks it.
- Setting `"scripts": false` drops `allow-scripts` from the sandbox entirely, so
  no JavaScript runs at all, nonce or not.

External resources are enforced by the same CSP at runtime (see *Inline assets
only* above); the commit-time URL check is an early author convenience, not the
security boundary.

## Checking before commit

Run the checker before staging:

```bash
card html check [CARD_REPO_PATH]/html/walkthrough.html
```

Or check all files in the directory:

```bash
card html check [CARD_REPO_PATH]/html/
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
