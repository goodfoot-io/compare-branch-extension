# Shadow Tokens

> VS Code's workbench shadow variables do not reach into webviews — every shadow a webview or card-HTML page uses must be self-defined here. This file is the single source of truth for shadow values; components reference the named token, never a raw `box-shadow`.

Depends on: `colors.md` (`--vscode-widget-shadow` used by the legacy token).

---

## Token naming

| Pattern | Rule |
|---|---|
| `shadow-popover` | Floating overlays: tooltips, menus, dropdown lists |
| `shadow-dialog` | Modal/dialog surfaces |
| `shadow-legacy` | Older widget shadow, ties to a real VS Code var — prefer the two above for new work |
| `shadow-diagram` | Depth planes inside a work-diagram SVG only (a named exception in the skill's §5) — an SVG `drop-shadow` filter, never `box-shadow` |

---

## Shadow scale

| Token | Value | Used by |
|---|---|---|
| shadow-popover | `0 0 12px rgba(0,0,0,0.14)` | Tooltips, context menus, dropdown/select lists |
| shadow-dialog | `0 0 20px rgba(0,0,0,0.15)` | Modal dialogs, quick-input overlay |
| shadow-legacy | `0 2px 8px var(--vscode-widget-shadow)` | Older widget-style elevation; new components prefer `shadow-popover`/`shadow-dialog` |
| shadow-diagram | `filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25))` | Elevation planes inside a work-diagram SVG (cards skill `work-diagram-style.md`); never page chrome |

---

## Flat registry

```
shadow-popover   0 0 12px rgba(0,0,0,0.14)
shadow-dialog    0 0 20px rgba(0,0,0,0.15)
shadow-legacy    0 2px 8px var(--vscode-widget-shadow)
shadow-diagram   filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25))   (SVG-internal only)
```

---

## Usage by surface type

| Surface | Shadow |
|---|---|
| Tooltip | shadow-popover |
| Context menu, dropdown list | shadow-popover |
| Modal/dialog | shadow-dialog |
| Quick-input overlay | shadow-dialog |
| Legacy/older widget chrome | shadow-legacy |
| Work-diagram SVG depth planes | shadow-diagram (SVG `drop-shadow` filter; HTML chrome around the diagram stays flat) |
| Flat surfaces (buttons, inputs, cards at rest) | none — see rationale |

---

## Flat-by-default philosophy

VS Code UI is flat: resting buttons, inputs, list rows, and panel surfaces carry no shadow. Separation comes from a hairline border (`strokeThickness` 1px) or a background-color step, not elevation. Reach for a shadow only for genuinely floating layers (popover/dialog) that sit above page content in a stacking context — see `layers.md`.

## Prohibited

- No `box-shadow` values outside this registry.
- No shadow on resting buttons, inputs, list rows, tabs, or panel containers — flat by default.
- No shadow referencing a workbench-only `--vscode-*` var other than `--vscode-widget-shadow` (used only inside `shadow-legacy`) — webviews don't receive the others.
- No drop-shadow on hover as a hover effect — see `motion.md`.
