# Badges

> compact counts and status indicators.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/spacing.md`, `foundation/typography.md`

Two families exist: the generic **counter badge** (VS Code's native badge, used for notification counts) and the **Cards status badge** (outline or filled chip showing a card's workflow status). Both are flat — no shadow — and lean on borders/fill rather than elevation.

---

## Anatomy

| Part | Role |
|---|---|
| **Root** | Inline chip or circle |
| **Label** | Count or status text |
| **Dot** | Optional filled circle, no label (status-dot variant) |

---

## Counter badge

| Property | Token / value |
|---|---|
| Background | `--vscode-badge-background` |
| Foreground | `--vscode-badge-foreground` |
| Radius | `cornerRadius.circle` (see `foundation/radius.md`) |
| Font | label3 (10px, see `foundation/typography.md`) |
| Padding | `size20`–`size40` horizontal (see `foundation/spacing.md`) |
| Min box | square, height ≈ label3 line-height + padding |

Used for unread/notification counts on tabs, tree items, or activity icons.

---

## Cards status badge

Renders a card's workflow status: `--cards-status-todo` / `-active` / `-needs-review` / `-done` / `-archived` (see `foundation/colors.md`). Labels: **To Do**, **Active**, **Needs Review**, **Done**, **Archived**.

### Outline (default)

| Property | Value |
|---|---|
| Background | `transparent` |
| Border | 1px solid status variable |
| Text | status variable |
| Radius | `cornerRadius.small` |

Used on status buttons/selectors.

### Filled

| Property | Value |
|---|---|
| Background | status variable |
| Text | Theme-invariant literal paired to the invariant fill: `#ffffff` on `todo`/`active`/`archived`; `#000000` on `needs-review`/`done` (the amber and green fills fail contrast with white text) |
| Radius | `cornerRadius.small` |

Never a theme variable for filled-badge text — it flips with the theme while the fill doesn't, failing contrast in one polarity. The literals are a named exception in `SKILL.md`.

### Status dot

| Property | Value |
|---|---|
| Shape | Circle, `cornerRadius.circle` |
| Size | 8px |
| Fill | status variable, filled (no border) |
| Label | None visible — `role="img"` + `aria-label` on the dot (a bare `<span aria-label>` has no role that permits the attribute and fails `aria-prohibited-attr`), or adjacent visible text with the dot `aria-hidden` |

---

## Variants

### Counter

Circle badge, count text, `--vscode-badge-*` colors.

### Status outline

Transparent fill, colored border + text — the default on status buttons.

### Status filled

Solid status-color fill; text is the fixed literal from the Filled table (`#ffffff` or `#000000` per status).

### Status dot

Icon-only filled circle — no text, requires `aria-label`.

---

## States

| State | Treatment |
|---|---|
| Resting | As specified above |
| On dark/light theme | Status hexes are theme-invariant — same value in light and dark |
| HC | Outline badges already carry a real border; filled badges add `border: 1px solid var(--vscode-contrastBorder, transparent)` so the shape survives HC |

---

## Accessibility

- Status dot and any icon-only badge require an accessible name for the status: `role="img" aria-label="Active"` (never `aria-label` on a role-less `<span>`).
- Never encode status by color alone — outline/filled variants always pair color with the label text; only the dot omits visible text, and only when adjacent text or `aria-label` supplies it.
- Counter badges surface the count in the parent control's accessible name where the badge itself isn't independently focusable.

---

## Prohibited

- No literal hex — every fill/border/text color is a `--vscode-badge-*` or `--cards-status-*` variable, except filled-badge text (`#ffffff`/`#000000` per the Filled table — named exception).
- No re-hardcoding `STATUS_HEX_COLORS` values (own file: `foundation/colors.md`).
- No theme variable as filled-badge text — the fill is theme-invariant, so the text must be too.
- No radius outside `cornerRadius.small` (chip) or `cornerRadius.circle` (counter/dot).
- No shadow on any badge variant.
- No status dot without an accessible name.
