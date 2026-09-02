# Menus

> a floating list of actions or options, opened on demand.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/shadows.md`, `foundation/spacing.md`, `foundation/typography.md`, `foundation/motion.md`, `foundation/layers.md`

Context menus, dropdown-select popups, and command-style lists share one visual language: a bordered panel with a popover shadow, rounded corners, and single-color selection highlighting per row. Keyboard navigation is mandatory — these are the only overlay a mouse-only implementation is not acceptable for.

---

## Anatomy

| Part | Role |
|---|---|
| **Panel** | Floating container, positioned relative to its trigger |
| **Item** | One selectable row (label, optional icon, optional shortcut hint — a `<kbd>` per `foundation/typography.md`) |
| **Separator** | Thin divider grouping related items |

## Layout & sizes

| Property | Value |
|---|---|
| Radius | `--vscode-cornerRadius-large` (8px, `radius.md`) |
| Item row height | ~22px |
| Item padding | `2px 6px` (vertical 2px convention, `spacing.md`-style) |
| Shadow | `shadow-popover` (`foundation/shadows.md`) |
| Stacking | Above page content — see `foundation/layers.md` |

## Color & surface

| Property | Token |
|---|---|
| Panel background | `--vscode-menu-background` |
| Panel text | `--vscode-menu-foreground` |
| Panel border | `1px solid var(--vscode-menu-border, transparent)` |
| Separator | `--vscode-menu-separatorBackground` |
| Selected/hovered item background | `--vscode-menu-selectionBackground` |
| Selected/hovered item text | `--vscode-menu-selectionForeground` — applies to the whole row including shortcut hints, `<kbd>`/keybinding labels, and secondary text; neither `--vscode-descriptionForeground` nor `--vscode-keybindingLabel-*` colors may persist on a selection background (both fail contrast) — shortcut chips also drop their own `keybindingLabel-background`/border to transparent there |

## Variants

### Context menu
Opens at cursor position on right-click or a "more actions" trigger; closes on outside click, `Escape`, or item selection.

### Dropdown / select popup
Opens below (or above, if clipped) its trigger control; see `components/select.md` for the trigger itself — this file owns only the popup.

### `<vscode-context-menu>`
Where the CDN element bundle is loaded (`contexts.md`), prefer the vscode-elements menu over a hand-rolled popup:
```html
<vscode-context-menu>
  <vscode-context-menu-item label="Rename"></vscode-context-menu-item>
  <vscode-context-menu-item label="Delete"></vscode-context-menu-item>
</vscode-context-menu>
```
Shadow-DOM element — theme via `--vscode-menu-*` vars set on the host.

## States

| State | Treatment |
|---|---|
| Closed | Not rendered (or `display: none`) |
| Open | Fade in, `motion-duration-base` (`foundation/motion.md`) |
| Item default | `-menu-background` / `-menu-foreground` |
| Item hover/keyboard-focused | `-menu-selectionBackground` / `-menu-selectionForeground` |
| Item disabled | `opacity: 0.4`, not focusable |
| Currently-selected option (select popups only) | Leading `codicon-check` + `aria-selected="true"` — distinct from the momentary hover/focus state |
| High contrast | Panel border always visible; focused item marked with `--vscode-contrastActiveBorder` instead of relying on background alone |

## Accessibility

- Panel: `role="menu"` (context menu) or `role="listbox"` (select popup); items `role="menuitem"`/`role="option"` on real focusable elements (`<button>` or `tabindex`-managed rows), never inert `<div>`s.
- Full keyboard support: `↑`/`↓` move focus and wrap, `Enter`/`Space` activates, `Escape` closes and returns focus to the trigger.
- Focus never leaves the panel while open (focus trap).
- Opening a menu moves focus to the first (or currently selected) item; closing restores focus to the trigger.

## Prohibited

- No literal hex colors — `--vscode-menu-*` only.
- No radius other than `radius.large` (8px).
- No shadow other than `shadow-popover`.
- No hover-only feedback without the HC border/contrastActiveBorder fallback.
- No mouse-only interaction — keyboard navigation is required, not optional.
