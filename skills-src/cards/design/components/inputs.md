# Inputs

> collects a single line or block of user text.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/spacing.md`, `foundation/typography.md`, `foundation/motion.md`

Text fields and textareas are flat rectangles: theme-colored background and border, no shadow, validation communicated through a border-color + message-block swap rather than icons alone.

---

## Anatomy

| Part | Role |
|---|---|
| **Label** | Field name, above the control |
| **Control** | `<input>`, `<textarea>`, `<vscode-textfield>`, `<vscode-textarea>` |
| **Hint** | Optional helper text below the control |
| **Validation block** | Optional info/warning/error message, replaces or supplements hint |

## Layout & sizes

| Property | Value |
|---|---|
| Padding | `4px 6px` |
| Width | fills the field container — vscode-elements hosts default to a fixed 320px intrinsic width and overflow narrower containers; always set `width: 100%` (or an explicit width) on the host |
| Radius | `--vscode-cornerRadius-small` (4px, `radius.md`) |
| Font | inherited 13px body (`typography.md`) |
| Line height | 16px (unset/`normal` overshoots the ~26px total) |
| Total height (single line) | ~26px |
| Validation message | 12px / 17px line-height |

## Color & surface

| Property | Token |
|---|---|
| Background | `--vscode-input-background` |
| Text | `--vscode-input-foreground` |
| Border | `1px solid var(--vscode-input-border, transparent)` |
| Placeholder | `--vscode-input-placeholderForeground` |
| Label | `--vscode-foreground` |
| Hint | `--vscode-descriptionForeground` |

## Validation

Each severity swaps background, foreground, and border together — never mix severities across the three properties.

| Severity | Background | Foreground | Border |
|---|---|---|---|
| Info | `--vscode-inputValidation-infoBackground` | `--vscode-inputValidation-infoForeground` | `--vscode-inputValidation-infoBorder` |
| Warning | `--vscode-inputValidation-warningBackground` | `--vscode-inputValidation-warningForeground` | `--vscode-inputValidation-warningBorder` |
| Error | `--vscode-inputValidation-errorBackground` | `--vscode-inputValidation-errorForeground` | `--vscode-inputValidation-errorBorder` |

The validation block renders as a small panel directly below the control, same width, message at 12px/17px. Field border also switches to the severity border color while the message is shown.

## Variants

### Text field
Single-line `<input>` or `<vscode-textfield>`.

### Textarea
Multi-line `<textarea>` or `<vscode-textarea>`; same padding/radius/border rules, height grows with content or a fixed `rows`.

### `<vscode-textfield>` / `<vscode-textarea>`
```html
<vscode-textfield placeholder="Card title"></vscode-textfield>
<vscode-textarea rows="4" placeholder="Description"></vscode-textarea>
```
Shadow-DOM elements — theme by setting `--vscode-input-*` vars on the host, not by targeting inner classes. The host ships a fixed 320px default width that ignores flex/grid sizing — set `width: 100%` on it (Width row above) or it overlaps neighboring fields.

## States

| State | Treatment |
|---|---|
| Default | `-input-background/-border` |
| Hover | No change — inputs do not have a hover fill in this theme |
| Focus | `outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px` |
| Disabled | `opacity: 0.4`, `pointer-events: none` |
| Validation (info/warning/error) | Background/foreground/border triplet above |
| High contrast | Border always visible (no `transparent` fallback needed beyond the shared pattern); focus uses `--vscode-contrastActiveBorder` |

## Accessibility

- Every control has an associated `<label>` (or `aria-label`) — never placeholder-only labeling.
- `<vscode-textfield>`/`<vscode-textarea>`: `label[for]` cannot reach the shadow-DOM input — use the element's `label` attribute or `aria-label` on the host, always.
- Validation messages are programmatically associated via `aria-describedby`.
- Error severity also sets `aria-invalid="true"` on the control.
- Focus outline is never suppressed.

## Prohibited

- No literal hex colors — `--vscode-input-*` / `--vscode-inputValidation-*` only.
- No shadow on the control at any state.
- No radius other than `radius.small` (4px).
- No hover background swap on inputs (unlike buttons) — VS Code inputs are static until focus.
- No `@vscode/webview-ui-toolkit` — deprecated.
