# Checkbox & Radio

> binary or single-choice selection controls.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/spacing.md`, `components/codicons.md`

Checkboxes and radios are small bordered boxes theme-colored independently of buttons and inputs — VS Code gives them their own color group. Checkbox uses a square with a codicon check glyph; radio uses a circle with a filled dot.

---

## Anatomy

| Part | Role |
|---|---|
| **Control** | Native `<input type="checkbox|radio">` (visually styled or hidden), never a role-attributed `<span>`/`<div>` |
| **Box** | 18px square (checkbox) or circle (radio) — may be a styled wrapper around the native input |
| **Glyph** | Codicon check (checkbox, checked only) or filled dot (radio, selected only) |
| **Label** | `<label>` wrapping or `for`-linked to the native input; click target extends to it |

## Layout & sizes

| Property | Value |
|---|---|
| Box size | 18×18px — checkbox and radio alike |
| Radius (checkbox) | `--vscode-cornerRadius-xSmall` (2px, `radius.md`) |
| Radius (radio) | `radius.circle` (9999px, `radius.md`) |
| Border width | `--vscode-strokeThickness` (1px, `radius.md`) |
| Label gap | `--vscode-spacing-size60` (6px, `spacing.md`) |

## Color & surface — checkbox

| Property | Token |
|---|---|
| Background (unchecked) | `--vscode-checkbox-background` |
| Border | `1px solid var(--vscode-checkbox-border, transparent)` |
| Background (checked) | `--vscode-checkbox-selectBackground` |
| Border (checked) | `--vscode-checkbox-selectBorder` |
| Check glyph | `--vscode-checkbox-foreground` |

## Color & surface — radio

| Property | Token |
|---|---|
| Background (unselected) | `--vscode-radio-inactiveBackground` |
| Border (unselected) | `1px solid var(--vscode-radio-inactiveBorder, transparent)` |
| Hover background (unselected) | `--vscode-radio-inactiveHoverBackground` |
| Background (selected) | `--vscode-radio-activeBackground` |
| Border (selected) | `--vscode-radio-activeBorder` |
| Fill dot (selected) | `--vscode-radio-activeForeground` |

Never substitute a checkbox or button color group for radios — the theme registers `--vscode-radio-*` separately.

## Variants

### Checkbox
Square box; checked state shows a codicon check (`codicon-check`, see `components/codicons.md`) at 16px inside the 18px box.

### Radio (grouped)
Circular box; only one radio in a `name`-grouped set may be selected. Selected shows a filled inner dot in `--vscode-radio-activeForeground`.

### `<vscode-checkbox>` / `<vscode-radio>`
```html
<vscode-checkbox checked>Show archived</vscode-checkbox>
<vscode-radio-group>
  <vscode-radio name="status" value="todo">To Do</vscode-radio>
  <vscode-radio name="status" value="active" checked>Active</vscode-radio>
</vscode-radio-group>
```
Shadow-DOM elements — theme via `--vscode-checkbox-*` / `--vscode-radio-*` vars set on the host.

## States

| State | Treatment |
|---|---|
| Default (unchecked/unselected) | Base border, transparent fill |
| Checked/selected | `-selectBackground`/`-selectBorder` (checkbox) or active foreground fill (radio) |
| Hover | Border only — no fill change (matches input, not button, behavior) |
| Focus | `outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px` — when hiding the native input, nest it inside the visible box (absolute, `opacity: 0`) and style the box via `:focus-within` |
| Disabled | `opacity: 0.4`, `pointer-events: none` |
| High contrast | Border always visible; selected marked additionally with `--vscode-contrastActiveBorder` |

## Accessibility

- Native `<input type="checkbox|radio">` (or the shadow-DOM equivalents, which proxy native semantics) — never a `<div>` with click handlers.
- Every box has an associated `<label>`; label click toggles the control.
- Radio groups share a `name` (or `<vscode-radio-group>`) so arrow keys move selection.
- Focus outline is never suppressed.

## Prohibited

- No literal hex colors — `--vscode-checkbox-*` / `--vscode-radio-*` only.
- No borrowing button or input color tokens for checkbox/radio fills.
- No radius other than `xSmall` (checkbox) or `circle` (radio).
- No custom glyph other than the codicon check for checkbox.
- No shadow at any state.
