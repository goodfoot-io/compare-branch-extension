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

External URLs (`https://`, `http://`, `//`) in `src` and `href` attributes are forbidden and rejected at commit time. Use `data:` URIs for images, fonts, and binary assets, or reference files that are relative paths within the card repo.

## `scripts: false` opt-out

Setting `"scripts": false` in the sidecar drops `allow-scripts` from the iframe sandbox. The iframe then runs with `allow-same-origin` only — no JavaScript executes.

By default (`scripts` omitted or `true`) the sandbox is `allow-scripts allow-same-origin`. Agent-authored scripts receive a CSP nonce at render time and execute normally.

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
