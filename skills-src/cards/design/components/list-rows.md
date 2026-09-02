# List Rows

> flat, dense rows for lists and trees.
> Depends on: `foundation/colors.md`, `foundation/spacing.md`, `foundation/typography.md`

Renders the workbench list/tree standard: 22px rows, flat backgrounds, no shadows. Selection and focus are two independent states (a row can be selected and not focused, e.g. list blurred) with distinct variables — never collapse them into one style.

---

## Anatomy

| Part | Role |
|---|---|
| **Row** | Full-width hit target |
| **Indent guide** | Vertical rule showing tree depth |
| **Twistie** | Expand/collapse chevron (trees only) |
| **Icon** | Optional leading icon/codicon |
| **Label** | Primary text, may contain a highlighted match |
| **Description** | Optional trailing/secondary text, dimmer |

---

## Layout

| Property | Token / value |
|---|---|
| Row height / line-height | 22px |
| Horizontal padding | `--vscode-spacing-size60`–`size80` |
| Indent per depth level | 8px per level (icon/twistie width) |
| Icon size | 16px (codicon default, see `codicons.md`) |

## Typography

| Property | Token / value |
|---|---|
| Label | body1 (13px), regular |
| Description | body2 (11px), `--vscode-descriptionForeground` — resting rows only; on hovered/selected rows it follows that state's foreground (see below) |
| Highlighted match | `--vscode-list-highlightForeground` |

## Color & surface

| State | Background | Foreground |
|---|---|---|
| Resting | transparent | `--vscode-foreground` |
| Hover | `--vscode-list-hoverBackground` | `--vscode-list-hoverForeground` |
| Selected, list focused | `--vscode-list-activeSelectionBackground` | `--vscode-list-activeSelectionForeground` |
| Selected, list blurred | `--vscode-list-inactiveSelectionBackground` | `--vscode-list-inactiveSelectionForeground` |
| Keyboard focus (not selected) | `--vscode-list-focusBackground` | inherit |
| Drop target (drag over) | `--vscode-list-dropBackground` | inherit |

Indent guides: `--vscode-tree-indentGuidesStroke`, 1px.

**Secondary text follows the row state.** On a hovered or selected row, the description (and any shortcut hint) switches to that state's foreground variable — optionally at `opacity: 0.75–0.85` for hierarchy — never staying on `--vscode-descriptionForeground` (fails contrast on selection fills).

## Card variant (status highlight)

An "active card" row/tile (`role="option"`; the container — flat list or tile grid alike — carries `role="listbox"`) highlights with its status color at **10% opacity** as background fill, paired with `aria-selected` and its status badge/dot as the non-color cue — see `foundation/colors.md` `--cards-status-*` usage rules. Never use a flat selection background for status-driven highlighting; use the status tint instead.

---

## Variants

### Tree

Adds twistie + indent guides; label/description unchanged.

### Deemphasized row

Foreground `--vscode-list-deemphasizedForeground` — greyed-out/excluded items (e.g. gitignored files).

### Error / warning row

Foreground `--vscode-list-errorForeground` / `--vscode-list-warningForeground`, applied to label only. Semantic foregrounds (error/warning/deemphasized) persist on hover but yield to the selection foreground on selected rows.

---

## States

| State | Treatment |
|---|---|
| Hover | background/foreground swap (see table above) |
| Keyboard focus | `--vscode-list-focusBackground` background + `--vscode-list-focusOutline` outline, 1px, offset -1px |
| Selected (focused list) | active selection colors |
| Selected (blurred list) | inactive selection colors, no focus outline |
| Disabled | `--vscode-disabledForeground`, no hover/selection feedback |
| High contrast | hover background suppressed and replaced by `outline: 1px dashed var(--vscode-contrastActiveBorder); outline-offset: -1px` (the workbench `listHoverOutline` source convention — a styling default, not a `--vscode-*` variable); selected/focused rows get a solid 1px `--vscode-list-focusOutline` / `--vscode-contrastActiveBorder` outline instead |

---

## Accessibility

- Use `role="listbox"`/`role="option"` or `role="tree"`/`role="treeitem"` as appropriate; never a bare `<div>` grid with no roles.
- Roving `tabindex`: one row is `tabindex="0"`, rest `-1"`; arrow keys move focus.
- `aria-selected` on selectable rows; `aria-expanded` on tree parents.
- Selection and focus must both be conveyed by more than color (the distinct background tokens already do this — do not remove them to "simplify").

## Prohibited

- No row height other than 22px in list/tree contexts.
- No collapsing active-selection and inactive-selection into one style — a blurred list must look different from a focused one.
- No hover-only feedback with no HC fallback — pair with the dashed-outline/border pattern above.
- No `--vscode-descriptionForeground` on hovered/selected rows — secondary text takes the state's foreground.
- No status highlight above 10% opacity for Cards active-card rows.
