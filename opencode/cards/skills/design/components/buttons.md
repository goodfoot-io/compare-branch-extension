# Buttons

> triggers a single action, rendered via the live VS Code theme.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/spacing.md`, `foundation/typography.md`, `foundation/motion.md`, `components/codicons.md`

VS Code buttons are flat, rectangular controls — solid fill for primary actions, a muted fill for secondary, no shadow ever. The theme supplies every color; only structure (padding, radius, font size) is fixed here.

---

## Anatomy

| Part | Role |
|---|---|
| **Root** | `<button>`, `<vscode-button>`, or `<a>` styled as a button |
| **Label** | Text content |
| **Icon** | Optional codicon, leading or standalone (icon buttons) |

## Sizes

| Property | Default | Small |
|---|---|---|
| Padding | `4px 8px` | `3px 6px` |
| Font size | 12px | 11px |
| Line height | 16px | 14px |
| Total height | ~26px | ~22px |
| Radius | `--vscode-cornerRadius-small` (4px, `radius.md`) | same |

## Color & surface

| Property | Primary | Secondary |
|---|---|---|
| Background | `--vscode-button-background` | `--vscode-button-secondaryBackground` |
| Text | `--vscode-button-foreground` | `--vscode-button-secondaryForeground` |
| Hover background | `--vscode-button-hoverBackground` | `--vscode-button-secondaryHoverBackground` |
| Border | `1px solid var(--vscode-button-border, transparent)` | same |

Border always uses the var-with-fallback HC pattern (`colors.md`) — invisible normally, visible in high contrast.

## Icon buttons

Square control, no visible label: codicon glyph centered, hover fill `--vscode-toolbar-hoverBackground` (no border, no background at rest). Hit area ≥ 24×24px via padding even though the glyph is 16px (`accessibility.md` §6). See `components/codicons.md` for glyph sizing (16px default, 12px compact). `aria-label` is mandatory since there is no text.

## Variants

### Primary
Solid `--vscode-button-background` fill — one per action group, the obvious next step.

### Secondary
Solid `--vscode-button-secondaryBackground` fill — for the paired dismiss/cancel action or a non-primary choice.

### Icon
Transparent at rest, `--vscode-toolbar-hoverBackground` on hover; toolbar clusters sit flush (0 gap, `spacing.md`).

### Cards status button
Transparent background; border and text both set to the relevant `--cards-status-*` variable (`foundation/colors.md`). Selected state: the status variable at 10% opacity as background fill, plus a leading `codicon-check` and `aria-pressed="true"` (the non-color cue colors.md requires).

### `<vscode-button>` element
Prefer the `@vscode-elements/elements` custom element over hand-rolled markup where the CDN stack is loaded (`contexts.md`):
```html
<vscode-button>Save</vscode-button>
<vscode-button secondary>Cancel</vscode-button>
<vscode-button appearance="icon" aria-label="Close"><span class="codicon codicon-close"></span></vscode-button>
```
Since it renders in shadow DOM, theme it by setting `--vscode-button-*` vars on the host element, not by targeting classes. `<vscode-button>` has no small variant — hand-roll a `<button>` per the Sizes table when small is required.

### Tailwind
Use the token-bridge classes from `contexts.md` (`bg-vscode-button-background`, `text-vscode-button-foreground`, `hover:bg-vscode-button-hoverBackground`) over hand-rolled CSS inside extension webviews.

## States

| State | Treatment |
|---|---|
| Default | Resting fill + border-with-fallback |
| Hover | Background swaps to `-hoverBackground`, `motion-duration-fast` — no shadow, no transform |
| Active/pressed | Background holds at hover value |
| Focus (keyboard) | `outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px` |
| Disabled | `opacity: 0.4`, `pointer-events: none`, native `disabled` attribute |
| High contrast | Border becomes visible; hover background suppressed, rely on `--vscode-contrastActiveBorder` for active state |

## Accessibility

- Native `<button type="button|submit|reset">` for actions; `<a>` only for navigation.
- Icon-only buttons require `aria-label`.
- Keyboard focus outline is never removed without an equivalent replacement.
- Disabled controls leave the tab order.

## Prohibited

- No literal hex colors — `--vscode-button-*` or `--cards-status-*` only.
- No shadow on any button state.
- No corner radius other than `radius.small` (4px).
- No hover effect beyond a background swap (no scale/transform).
- No `@vscode/webview-ui-toolkit` — deprecated.
- No two primary buttons in one action group.
