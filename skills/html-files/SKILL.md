---
name: html-files
description: Author HTML files in a card repository — complete-document structure, two-file pairing, sidecar schema, relative assets/ references, inline CSS styling, and the cards html check gate.
---
<!-- @goodfoot/agent-skills source: skills-src/shared/html-files/SKILL.md.eta sha256:fa62d4333eacc0306ff8e9f4d049ecdd0abb98ec34b6721ca1d7929c0394c3c7 -->

<placeholder-variables>
[CARD_REPO_PATH] — Absolute path to the card's git repository (the `repositoryPath` field from `card` output, or the `$CARD_REPO_PATH` environment variable)
</placeholder-variables>

# HTML Files in a Card

Drop interactive HTML pages anywhere in a card repository except under `attachments/`. They appear as expandable rows in the card-detail timeline and grow or shrink to their normal-flow content height. Each row sits at the date of the commit that first added the file, so commit order — not filename or path — decides where a page falls relative to CARD.md and the other timeline entries. The card detail owns vertical scrolling; previews must not create their own scrolling region. The Cards server serves each page as a real document at `/cards/<cardId>/html-files/<path>`.

## Required document structure

An HTML card file must be an explicit, complete document: an authored `<!DOCTYPE html>` declaration plus explicit `<html>`, `<head>`, and `<body>` start tags. Both authoring gates — the `cards html check` CLI and the card-repository pre-commit hook — apply the same shared [checkHtmlContent()](./public/packages/sdk/src/protocol/types/html.ts#L1241-L1375) and reject fragments: structure the HTML parser inserts implicitly does not count, so a file that omits the skeleton fails even though a browser would repair and render it. Start every page from this skeleton:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- title, styles, page setup -->
  </head>
  <body>
    <!-- page content -->
  </body>
</html>
```

The guard is deliberately narrow and reads the parse tree, not the raw text: lookalike `<!DOCTYPE`/`<html>`/`<head>`/`<body>` inside a comment or a `<script>` body produces no such node in the parse and satisfies nothing. It does not require closing tags (an omitted `</body>` passes), does not impose XHTML, and does not attempt exhaustive malformed-root or standards-conformance checking — a clean check means "a complete document," not "perfectly nested" (see *Well-formedness check — what it catches*). An incomplete file fails with a single path-prefixed error naming every missing boundary:

```text
page.html: missing required document structure: the <!DOCTYPE html> declaration, the <html> start tag, the <head> start tag, and the <body> start tag — an HTML card file must be a complete document: write the <!DOCTYPE html> declaration and explicit <html>, <head>, and <body> start tags (structure the parser inserts implicitly does not count)
```

This is a document-shape gate only — it establishes no CSP, transport, dependency-graph, script, or runtime safety. Those boundaries are the ones described in *Inline or `https://` assets* and *Scripts, nonces, and the CSP* below.

## Two-file pairing

Every HTML file requires a same-basename sidecar next to it. Both files must be committed together:

```
docs/architecture-overview.html
docs/architecture-overview.meta.json
```

An orphan `.html` without its `.meta.json`, or a `.meta.json` without its `.html`, is rejected by the pre-commit hook.

## Relative `assets/` references

A page may load files from the card repository's **root-level `assets/` directory** with an ordinary relative path. The document is served at a URL that mirrors its repo path, so the reference resolves in the browser exactly as written — no rewriting, no token:

```html
<!DOCTYPE html>
<html>
  <head>
  </head>
  <body>
    <!-- docs/overview.html → the repo-root assets/logo.png -->
    <img src="../assets/logo.png" alt="Architecture diagram">
  </body>
</html>
```

Any relative path that normalizes into root `assets/` (so `../assets/…` from `docs/`, `assets/…` from the repo root) is an *asset* reference; every other relative path is rejected. The asset is served at `/cards/<cardId>/html-files/assets/…` on the document's own origin — a same-origin subresource load, which needs no credential, no CORS, and works in `@font-face` and `fetch()` just as in `img`/`srcset`/`link`.

An `.html` file under root `assets/` is **not** a valid asset reference — that directory is fragment and template space, so the served-document contract (base target, theme bake, nonce stamp) never applies there and the checker rejects any reference resolving to it. Inline a page-like thing as a `data:` URI or load it over `https://`.

The asset route matches its literal `assets` segment against the raw URL before any percent-decoding, so an encoded separator or segment name inside the first segment of the reference — `assets%2Fdiagram.png`, `%61ssets/logo.png`, `%2e%2e/assets/…` — is refused: the browser keeps the encoded character inside one segment and the request never reaches the asset route. Write the path literally. An encoded character *after* the literal `assets/` prefix (`assets/100%2Fcomplete.png`, from a page at the repository root) is ordinary and accepted.

The asset must be committed **together with the page**: the pre-commit hook rejects a reference whose asset is not staged, naming the page and the asset (`create the file, stage it, or fix the reference`). It likewise rejects a staged deletion or rename of an asset a committed page references, and refuses symlinks under `assets/`.

Staging a root-`assets/` stylesheet also revalidates pages: the pre-commit hook re-runs the full validation — including the *Required document structure* check — on every committed page that references a stylesheet the commit stages. A legacy page committed as a fragment before this rule therefore fails a stylesheet-only commit with an error naming that page even though the page itself is untouched; convert it with the skeleton from *Required document structure* before committing its stylesheets (`CARDS_SKIP_HOOK=1` is the explicit bypass).

## Sidecar schema

[`<name>.meta.json`](./public/packages/sdk/src/protocol/types/html.ts) is a closed schema — unknown keys are rejected.

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `title` | string | yes | ≤ 120 characters |
| `summary` | string | yes | ≤ 280 characters |
| `scripts` | boolean | yes | Explicitly permits (`true`) or blocks (`false`) author JavaScript |

Example:

```json
{
  "title": "Architecture Overview",
  "summary": "Interactive diagram of the service mesh.",
  "scripts": false
}
```

## Intrinsic layout contract

Use a responsive normal-flow page. Cards owns the `html`/`body` canvas, margins, height, and overflow; place flex or grid application layouts beneath `body`. Do not use viewport or percentage-height root shells, root scrolling, deliberate horizontal overflow, fixed/absolute content that extends the canvas, or scripts whose height depends on the viewport. Static violations fail `cards html check`; dynamic or computed violations fail visibly at runtime.

## Styling

Write plain CSS yourself. No CSS framework is compiled in — an unstyled page renders unstyled. Put it in an inline `<style>` block:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      .cta { border-radius: 6px; background: #2563eb; color: #fff; padding: 8px 16px; }
    </style>
  </head>
  <body>
    <button class="cta">Submit</button>
  </body>
</html>
```

A separate stylesheet can be a `data:` URI like any other asset —
`<link rel="stylesheet" href="data:text/css;base64,…">` — or an `https://` link,
e.g. `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">`. A
relative path or `http://` link is rejected (see *Inline or `https://` assets*).

## Inline or `https://` assets

`src`/`href`/`srcset`/CSS `url()`/`@import` values may be a `data:` URI, a
same-document fragment (`#id`), an `https://` URL, or a relative path that
normalizes into the repository-root `assets/` directory (see *Relative
`assets/` references*). Every other relative path, `http://` (unencrypted), and
every other scheme (`javascript:`, `file:`, protocol-relative `//`, etc.) are
rejected — the served-document CSP has no token for them, so they'd fail to
load silently in the iframe even if the commit-time check let them through.
There is no host allowlist: any `https://` origin is usable.

An `https://` reference is a live third-party dependency, not an inlined
`data:` asset: the resource is fetched from whatever that host serves at
*render* time, not the byte content you committed, so it can change, go down,
or become unreachable independently of the card. Only reference hosts you trust
to keep serving what you expect.

## Scripts, nonces, and the CSP

The served document runs under a real Content-Security-Policy delivered as an HTTP response header by the Cards server. Each response uses separate fresh nonces for Cards platform code and permitted author code:

```
default-src 'none'; script-src 'nonce-<platform-nonce>' ['nonce-<author-nonce>' 'self' https:]; style-src 'unsafe-inline' 'self' data: https:; img-src 'self' data: https:; font-src 'self' data: https:; media-src 'self' data: https:; connect-src 'self' https:; base-uri 'none'; form-action 'none'
```

The `'self'` tokens are what the page's own references load under: the document and the root `assets/` files share the server's origin.

Do not write a `<base>` element. The document's own URL is the base — that is what makes relative `assets/` references resolve — and the server injects a target-only `<base>` at serve time for link opening. The checker rejects any author `<base>`: under the CSP's `base-uri 'none'` its `href` would be inert while its `target` would override the server's, silently changing where links open.

The CSP is a genuine runtime boundary — but it confines the network, not the
page's own scripts:

- **All JavaScript in the file you commit runs when `scripts` is `true`, and the page is trusted.** The server stamps author scripts with an author nonce distinct from the Cards platform runtime. The iframe sandbox is `allow-scripts allow-same-origin`, and the
  page is same-origin with the Cards server — the grant it needs to load its
  own relative `assets/` subresources and reach the server's API. The parent
  webview's origin (`vscode-webview://`) is a different origin entirely, so the
  page still cannot reach the parent even though it runs. Do **not** paste
  untrusted third-party `<script>` you don't intend to run.
- **An external `<script src="https://…">` runs on scheme, not nonce.** It
  can't carry the server-issued nonce, so `script-src`'s `https:` token
  authorizes it instead — treat a referenced external script with the same
  trust posture as a pasted one: it executes with full page trust the moment
  the card renders.
- **The CSP scopes the network to the server's origin and `https:`, not off
  entirely.** `connect-src 'self' https:` permits `fetch`/XHR/beacon to the
  Cards server (the page's own origin, the same one its `assets/` files load
  from) and to any `https://` origin from scripts running in the iframe
  (nonce'd inline or `https:`-loaded external); non-`https:` egress is still
  blocked, and a runtime-injected script (e.g.
  `document.createElement('script')`) still carries no nonce or scheme match
  and is blocked, as are inline event handlers and `eval`.
- **`"scripts": false` disables author JavaScript while preserving Cards behavior.** The CSP grants only the platform nonce, so live theme and intrinsic sizing still run without author scripts or external script sources.

External resources are enforced by the same CSP at runtime (see *Inline or
`https://` assets* above); the commit-time URL check is an early author
convenience, not the security boundary.

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

The pre-commit hook runs the same checks automatically on every staged HTML file and sidecar. It also enforces the *asset* half of the contract (see *Relative `assets/` references*): a reference into root `assets/` must name a staged file — otherwise the commit fails naming the page and the asset — and a staged deletion or rename of an asset a committed page references fails the same way.

## Well-formedness check — what it catches

The checker runs the source through the HTML5 parser (parse5) and rejects two
things, and only these. First, genuine structural failures — truncated or
broken-EOF markup such as an unterminated tag (`<div` with no `>`) or an
unclosed `<script>`. Second, incomplete documents — a missing `<!DOCTYPE html>`
declaration or a missing explicit `<html>`, `<head>`, or `<body>` start tag
fails with the *Required document structure* error, even though the parser
silently repairs such fragments while building the tree. It does **not** catch
every mis-nesting: the HTML5 parser auto-closes many unclosed or mis-ordered
tags (`<li>` without `</li>`, mis-nested inline elements) and those pass — the
structure guard never demands closing tags. Verify your structure yourself; a
clean check means "a complete, untruncated document," not "perfectly nested."
