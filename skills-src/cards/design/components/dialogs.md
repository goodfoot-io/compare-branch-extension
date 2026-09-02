# Dialogs

> modal overlays and quick-input-style pickers.
> Depends on: `foundation/colors.md`, `foundation/spacing.md`, `foundation/radius.md`, `foundation/shadows.md`, `foundation/layers.md`

Modal dialogs and quick-input pickers both float above page content on a dimmed backdrop, trap focus, and close on Escape. Quick-input additionally structures itself as a search field over a 22px-row result list, matching the workbench command palette.

---

## Anatomy

| Part | Role |
|---|---|
| **Backdrop** | Dimming scrim behind the dialog |
| **Container** | The dialog/quick-input surface |
| **Title** | Optional heading |
| **Body** | Message or form content |
| **Actions** | Button row (dialogs) |
| **Input** | Search/filter field (quick-input, at top) |
| **Result list** | 22px rows below the input (quick-input) |

---

## Layout

| Property | Token / value |
|---|---|
| Container padding | `--vscode-spacing-size160` (dialog); `--vscode-spacing-size80` (quick-input, tighter) |
| Actions gap | `--vscode-spacing-size80` |
| Result row height | 22px (see `list-rows.md`) |
| Radius | `cornerRadius.xLarge` (12px) on the container |
| Border | `--vscode-strokeThickness` (1px), `--vscode-widget-border` |

## Color & surface

| Part | Token |
|---|---|
| Container background | `--vscode-editorWidget-background` (dialog) or `--vscode-quickInput-background` (quick-input) |
| Container foreground | `--vscode-editorWidget-foreground` / `--vscode-quickInput-foreground` |
| Container border | `--vscode-widget-border` |
| Backdrop | `rgba(0,0,0,0.5)` flat scrim (no blur) |
| Quick-input title bar | `--vscode-quickInputTitle-background` |
| Result row focus | `--vscode-quickInputList-focusBackground` / `-focusForeground` |

## Shadow & layer

- Shadow: `shadow-dialog` (see `foundation/shadows.md`), on the container only — never on the backdrop.
- Layer: `z-dialog` (see `foundation/layers.md`); backdrop sits directly below the container in the same stacking context.
- Gallery/demo pinning: to show a dialog open without covering the viewport, contain it in a `position: relative; overflow: hidden` demo frame with backdrop and container switched to `position: absolute`.

---

## Variants

### Modal dialog

Title + body + right-aligned action row (primary button per `buttons.md` last). Backdrop click does **not** close a destructive-confirmation dialog; it may close an informational one — decide per use, document the choice at the call site.

### Quick-input picker

Input field pinned at top (`--vscode-input-*` styling, no visible container border of its own — it's flush with the quick-input container), 22px result rows below using `--vscode-quickInputList-focusBackground/-focusForeground` for the focused/highlighted row, matched-text portions in `--vscode-list-highlightForeground`.

---

## States

| State | Treatment |
|---|---|
| Open | backdrop and container fade in (opacity only, `motion-duration-base` per `foundation/motion.md`) |
| Focus trap | Tab/Shift+Tab cycle only within the container; focus never escapes to page content behind the backdrop |
| Initial focus | first focusable element, or the primary action for confirmation dialogs, or the input field for quick-input |
| Escape | closes the dialog/picker and returns focus to the triggering element |
| High contrast | container border always visible (`--vscode-widget-border` resolves to a real color in HC); focused result row adds `--vscode-contrastActiveBorder` |

---

## Accessibility

- Dialog: `role="dialog"` or `"alertdialog"` (destructive confirmations) with `aria-modal="true"`, `aria-labelledby` on the title.
- Quick-input: `role="combobox"` on the input wired to `role="listbox"` results via `aria-controls`/`aria-activedescendant`.
- Escape always closes; focus returns to the element that opened the dialog.
- Backdrop is `aria-hidden="true"` and inert to pointer/keyboard while the dialog is open.

---

## Prohibited

- No radius other than `cornerRadius.xLarge` on the dialog/quick-input container.
- No shadow token other than `shadow-dialog` on this surface.
- No focus trap omission — a dialog that lets Tab reach page content behind it is a bug.
- No backdrop blur or gradient — flat scrim only.
- No dialog opening without moving initial focus into it.
