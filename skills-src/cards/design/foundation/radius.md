# Radius Tokens

> VS Code's `cornerRadius.*` scale plus `strokeThickness`. Values below are literal px and the single source of truth; components reference token names, never raw radius values.

Depends on: none.

---

## Token naming

| Pattern | Rule |
|---|---|
| `--vscode-cornerRadius-<step>` | Named step (`xSmall`, `small`, `medium`, `large`, `xLarge`, `circle`) |
| `--vscode-strokeThickness` | Border width, not a radius — travels with the same registry group |

---

## Radius scale

| Token | px | Used by |
|---|---|---|
| cornerRadius.xSmall | 2 | — |
| cornerRadius.small | 4 | Buttons, inputs, code |
| cornerRadius.medium | 6 | — |
| cornerRadius.large | 8 | Menus |
| cornerRadius.xLarge | 12 | Dialogs, quick-input container |
| cornerRadius.circle | 9999 | Avatars, dot indicators, circular badges |

kbd is the one documented exception at **3px** (not on the named scale — see `typography.md`).

---

## Flat registry

```
cornerRadius.xSmall   2px
cornerRadius.small    4px
cornerRadius.medium   6px
cornerRadius.large    8px
cornerRadius.xLarge   12px
cornerRadius.circle   9999px
kbd radius            3px  (named exception, not on the scale)
--vscode-strokeThickness  1px
```

---

## Usage by surface type

| Surface | Radius |
|---|---|
| Buttons | 4px (small) |
| Inputs, textareas, selects | 4px (small) |
| Code / preformatted text | 4px (small) |
| kbd | 3px (named exception) |
| Menus, dropdown lists | 8px (large) |
| Dialogs, quick-input container | 12px (xLarge) |
| Badges, avatars, status dots | circle (9999px) |
| Borders (all bordered surfaces) | `strokeThickness` 1px |

## Prohibited

- No raw px radius values in components — reference the named token.
- No radius outside this scale (no 5/10/16px, etc.) except the documented kbd exception.
- No border width other than `strokeThickness` (1px) unless a component spec names an explicit exception.
