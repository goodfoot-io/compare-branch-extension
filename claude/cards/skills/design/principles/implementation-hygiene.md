# Implementation Hygiene

Generic engineering and UX-hygiene rules that apply regardless of theme or component library — these hold for both card HTML and extension webviews. Theme tokens and component specs live in `foundation/*.md` and `components/*.md`; this file is the standalone home for cross-cutting technique and process rules that don't belong to any single component or token.

---

## CSS deletion safety

Never delete or "deduplicate" a CSS rule without proving nothing uses it. Search the whole codebase for every class/selector it targets before removing or consolidating. A selector appearing once in the stylesheet is not dead if any element still carries that class. Deduplicate by consolidating repeated declarations, never by blindly deleting. After cleanup, reload and confirm every section still renders styled (hard-refresh — the dev server may serve a stale bundle).

## Reset native element margins inside bordered containers

`<blockquote>`, `<figure>`, `<p>`, `<ul>`/`<ol>` default to `margin: 0` whenever inside a card or bordered container — otherwise the user-agent default margin leaks outside the border and reads as phantom padding. All spacing comes from the container's own padding.

## Zero a list's default left padding, not just its margin

A `<ul>`/`<ol>` used as a layout row, nav, or menu carries the browser's default ~40px `padding-inline-start`. `margin: 0` and `list-style: none` don't remove it — set `padding-inline: 0` explicitly, or the row misaligns against sibling elements.

## Translucent backgrounds must blur what's behind them

Any element with a semi-transparent fill (a floating panel, a frosted overlay) pairs that translucency with `backdrop-filter: blur(...)` (+ `-webkit-` prefix). Without it, scrolling content underneath shows through razor-sharp. Keep a tint with alpha under the blur so text holds contrast; fall back to opaque where `backdrop-filter` is unsupported. Note: the default webview body background is already transparent — this rule applies to elements layered *above* content, not the body itself.

## Use real icon assets — codicons in this domain

Where the design calls for an icon, render a real codicon (`<span class="codicon codicon-chevron-down">`, `components/codicons.md`) — never a Unicode emoji, a bare letter, or a hand-rolled inline SVG, unless the brief explicitly requests emoji. In card HTML, load codicons via the sanctioned CDN stylesheet (`contexts.md`); inline-SVG `data:` URIs are the fallback per `components/codicons.md`. One icon family throughout; size/color follow the icon tokens in `foundation/typography.md`. Pair icons with accessible labels where meaning isn't obvious from context alone.

## Use real charting libraries, not placeholders

When rendering data visualization, use a real charting library bound to real data and styled with `--vscode-charts-*` — never a static image, CSS-bar mock, or placeholder graphic.

## One element owns vertical padding — never two nested

When a panel section and its inner content both add vertical padding on the same seam, the gap balloons. Decide which container owns the rhythm and zero the padding on the other.

## Joined input+button groups square their shared edges

When an input touches a button on one or both sides (search-with-button, stepper, segmented control), the touching edges square to `0` radius — only the outer corners of the group keep the normal radius. The input's focus outline must follow the squared corner too; never let a rounded outline peek out at a squared seam.

## Demo/gallery state pinning

To pin interactive states in a static demo page, give each state class a `.demo-<state>` twin sharing the real rule block (`.row:hover, .row.demo-hover { … }`) — same pattern as colors.md's `.demo-hc`. Pin any floating overlay (menu, tooltip, dialog) open via dialogs.md's demo-frame recipe — backdrop-less popovers (menus, tooltips, combobox popups) use the same relative frame without the scrim; the frame reserves their space so they never overlap following content. Shadow-DOM `vscode-*` elements can't take the twin-class recipe — demo the state matrix on the hand-rolled equivalent and include one live element to prove labeling/theming.

## No vendor leakage

Describe and implement UI through `--vscode-*` variables, `foundation/*.md` tokens, and `components/*.md` specs — never paste third-party component class strings from external docs directly into the work. Translate intent into this system's vocabulary.

## No duplicate borders between adjacent sections

Where two adjacent sections/rows/list items share an edge, only one draws that border. Pick one direction (e.g. bottom-only) and apply it consistently.

## Chart tooltip items take the series color

In a chart tooltip, each item's swatch, label, and value render in that series' `--vscode-charts-*` color, so the tooltip maps 1:1 to what it describes.

## One consistent hover-background treatment across every list/menu surface

Wherever a row shows a background on hover — list rows, dropdown/menu items, command-style rows — it uses the same `--vscode-list-hoverBackground` treatment everywhere. The active/selected state (`--vscode-list-activeSelectionBackground`) is a separate, stronger background, likewise reused consistently.

---

## Not duplicated here

Semantic HTML and ARIA usage (real `<h1>`–`<h6>`, `<button>` for actions, `<a>` for navigation, labeled form controls) is a hygiene rule too, but it is fully covered in `accessibility.md` §8 (Semantic Structure) — that is its one home. Numeric tokens (spacing, radius, color variables) live in `foundation/*.md`; component-specific anatomy and state rules live in `components/*.md`. Do not restate any of it here — link to the owning file instead.
