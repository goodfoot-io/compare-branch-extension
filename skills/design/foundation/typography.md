# Typography Tokens

> Type is inherited from the VS Code shell via `--vscode-font-*` variables; components layer VS Code's compact size ramp on top. Values below are literal and the single source of truth.

---

## Font variables

| Variable | Value | Notes |
|---|---|---|
| `--vscode-font-family` | host UI font stack | Not registry-generated; set directly by the shell |
| `--vscode-font-weight` | `normal` | Base weight |
| `--vscode-font-size` | `13px` | Base UI size — every webview inherits this on `body` |
| `--vscode-editor-font-family` | host monospace stack | Use for code/monospace, not `font-family-monospace` guesses |
| `--vscode-editor-font-weight` | editor weight | |
| `--vscode-editor-font-size` | editor size | |
| `--vscode-editor-font-feature-settings` | editor ligature settings | |
| `--text-link-decoration` | link underline value | Applied by the default webview stylesheet |

---

## Size ramp

Base UI text is **13px / line-height 1.4**. All other sizes are named tokens (`fontSize.*` in VS Code's registry → `--vscode-fontSize-*`).

| Token | px | Typical use |
|---|---|---|
| heading1 | 26 | Rare — top-level dialog/panel titles |
| heading2 | 18 | Section headings |
| heading3 | 13 | Sub-section headings, same size as body but weight 600 |
| body1 | 13 | Default body/control text |
| body2 | 11 | Secondary/dense body text |
| label1 | 12 | Form labels |
| label2 | 11 | Secondary labels |
| label3 | 10 | Smallest labels — badges, micro-text floor |

Codicons: 16px default, 12px compact variant.

---

## Flat registry

```
--vscode-font-family
--vscode-font-weight        normal
--vscode-font-size          13px
--vscode-editor-font-family
--vscode-editor-font-weight
--vscode-editor-font-size
--vscode-editor-font-feature-settings
--text-link-decoration
fontSize.heading1  26px
fontSize.heading2  18px
fontSize.heading3  13px
fontSize.body1     13px
fontSize.body2     11px
fontSize.label1    12px
fontSize.label2    11px
fontSize.label3    10px
line-height (base) 1.4
weight regular      400
weight semiBold      600
```

---

## Weights

Only two weights are in play: **regular (400)** default, **semiBold (600)** for emphasis/headings/active tab labels. Do not introduce 500/700 — the VS Code font stack is not tuned for intermediate weights.

---

## Monospace, code, kbd

- Code/preformatted text: `font-family: var(--vscode-editor-font-family)`; color `--vscode-textPreformat-foreground`, background `--vscode-textPreformat-background`; radius 4px (see `radius.md`).
- `kbd`: `--vscode-keybindingLabel-foreground/-background/-border/-bottomBorder`; label2 (11px); padding `3px 5px`; radius 3px (see `radius.md`).
- Block code (`textCodeBlock`): background `--vscode-textCodeBlock-background`.
- Never invent a `font-family-monospace` stack — always `var(--vscode-editor-font-family)`.

## Links

- Default: `color: var(--vscode-textLink-foreground)`.
- Active/pressed: `color: var(--vscode-textLink-activeForeground)`.
- Decoration: `text-decoration: var(--text-link-decoration)` (underlined in HC regardless).
- Blockquote citation rule: `--vscode-textBlockQuote-background` / `-border`.

## Usage by surface type

| Surface | Token |
|---|---|
| Body text, inputs, selects, list rows | body1 (13px), regular |
| Buttons | label1 (12px); small buttons label2 (11px) — see `components/buttons.md` |
| Card/detail-panel title | heading2 (18px), semiBold |
| Sub-section header | heading3 (13px), semiBold |
| Form label | label1 (12px) |
| Secondary label / meta | label2 (11px) |
| Badge / micro text | label3 (10px) floor — never smaller |
| Code inline/block | `--vscode-editor-font-family`, body2/body1 |

## Prohibited

- No px/rem values outside the ramp above — pick the nearest named size.
- No third weight — only 400 and 600.
- No custom monospace stack — use `--vscode-editor-font-family`.
- No text smaller than label3 (10px) anywhere, including badges.
- No underline outside links (HC forces link underline; do not fight it).
