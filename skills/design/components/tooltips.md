# Tooltips

> supplementary text on hover or focus.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/shadows.md`, `foundation/typography.md`, `foundation/layers.md`, `foundation/motion.md`

A small floating label clarifying an icon-only control or truncated string — supplementary only, never the sole home for essential instructions. Matches the VS Code hover-widget chrome, not a custom bubble.

---

## Anatomy

| Part | Role |
|---|---|
| **Trigger** | Element receiving pointer/focus |
| **Bubble** | Floating container |
| **Content** | Short text, one line preferred |

---

## Color & surface

| Property | Token |
|---|---|
| Background | `--vscode-editorHoverWidget-background` |
| Foreground | `--vscode-editorHoverWidget-foreground` |
| Border | 1px solid `--vscode-editorHoverWidget-border` |

---

## Layout

| Property | Value |
|---|---|
| Radius | `cornerRadius.small` (4px, see `foundation/radius.md`) |
| Shadow | `shadow-popover` (see `foundation/shadows.md`) |
| Font | body2 (see `foundation/typography.md`) |
| Max width | ~240px, wraps to two lines max |
| Z-index | `z-tooltip` (see `foundation/layers.md`) |

---

## Triggering

| Mode | When |
|---|---|
| Hover + focus (default) | Icon buttons, dense toolbars |
| Focus only | Keyboard-only reveal, no hover required |

Delay **~300–500ms** before show; hide immediately on blur, Escape, or pointer leave. Never trap focus inside the bubble.

---

## Variants

### Default

Hover-widget chrome bubble on hover/focus of the trigger. No pointer arrow — VS Code hover widgets are plain rectangles.

---

## States

| State | Treatment |
|---|---|
| Show | After the ~300–500ms show delay, opacity fade at `motion-duration-base` (delay then fade, not either/or — see `foundation/motion.md`) |
| Hide | Immediate, no fade required |
| Reduced motion | `body.vscode-reduce-motion` collapses fade to `motion-duration-instant` |
| HC | Border already always-visible via `--vscode-editorHoverWidget-border` — no extra fallback needed |

---

## Accessibility

- Trigger must be keyboard-focusable if the tooltip is focus-triggered.
- Use **`aria-describedby`** to link the trigger to the tooltip's id — but a description never *names* the trigger.
- An icon-only trigger therefore always requires its own `aria-label`; the tooltip supplements it (with different wording where possible) and never replaces it.
- Tooltip content never receives focus — it is not a dialog.

---

## Prohibited

- No pointer arrows on the bubble.
- No interactive controls (buttons, links, inputs) inside a tooltip — use a menu or dialog for rich/actionable content.
- No paragraphs — one short line, two max after wrap.
- No literal hex, shadow string, or hand-picked z-index — use the named tokens.
- No tooltip as the sole label for an icon-only control without a backing `aria-label`.
- No show delay under ~300ms (avoids flicker on incidental hover) or blocking pointer events to content beneath.
