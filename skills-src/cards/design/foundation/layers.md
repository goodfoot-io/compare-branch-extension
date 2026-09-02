# Layer & Scrollbar Tokens

> Stacking inside a single webview page is self-contained — there is no cross-webview z-index authority; each page owns its own stacking context. Scrollbars are custom-styled (10px thumb-only) rather than left to the OS default.

Depends on: `colors.md` (`--vscode-scrollbarSlider-*`).

---

## Token naming

| Pattern | Rule |
|---|---|
| `z-<layer>` | Named stacking layer, page-local only |
| `--vscode-scrollbarSlider-*` | Scrollbar thumb color variables |
| `--cards-scrollbar-width` | Cards-injected scrollbar width override |

---

## Stacking scale

| Token | z-index | Layer |
|---|---|---|
| z-base | 0 | Normal page content |
| z-sticky | 10 | Sticky headers/toolbars within the page |
| z-tooltip | 100 | Tooltips |
| z-menu | 200 | Context/dropdown menus, select lists |
| z-dialog | 300 | Modal dialogs, quick-input overlay |

Each layer must clear the one below it. There is no cross-page authority to coordinate against — pick the lowest layer that guarantees separation from this page's own content.

---

## Flat registry

```
z-base       0
z-sticky     10
z-tooltip    100
z-menu       200
z-dialog     300
--vscode-scrollbarSlider-background
--vscode-scrollbarSlider-hoverBackground
--vscode-scrollbarSlider-activeBackground
scrollbar width (default webview)   10px, thumb-only
--cards-scrollbar-width             host-injected, default 14px in detail panel
```

---

## Scrollbars

The default webview stylesheet ships a thumb-only scrollbar — no track chrome, no arrows: width 10px, colored via `--vscode-scrollbarSlider-background` (resting), `-hoverBackground` (hover), `-activeBackground` (dragging). Cards webviews override the width via `--cards-scrollbar-width` (host-injected, defaults to 14px in the detail panel) — use the variable, never a literal px width for scrollbar sizing. `--cards-scrollbar-width` is **not** forwarded to card-HTML iframes — there, use the 10px default.

## Usage by surface type

| Surface | Layer |
|---|---|
| Sticky section header/toolbar | z-sticky |
| Tooltip | z-tooltip |
| Context menu, dropdown/select list | z-menu |
| Modal dialog, quick-input | z-dialog |
| Any scrollable container | thumb-only scrollbar per above |

## Prohibited

- No z-index values outside this scale.
- No cross-page/global z-index coordination — a webview page only reasons about its own stack.
- No native/default browser scrollbar chrome — always the thumb-only treatment.
- No raw px scrollbar width — use `--cards-scrollbar-width` in Cards contexts, 10px default otherwise.
