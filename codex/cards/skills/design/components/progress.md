# Progress

> loading and completion feedback: bar, skeleton, spinner.
> Depends on: `foundation/colors.md`, `foundation/motion.md`, `foundation/typography.md`

Three patterns cover loading state: a thin **progress bar** (determinate/indeterminate), a **skeleton shimmer** for content placeholders, and a **spinner** (codicon) for inline/small-area loading.

---

## Anatomy

| Part | Role |
|---|---|
| **Track** | Full-width base line |
| **Fill** | Bar showing progress or sliding indeterminate segment |
| **Skeleton block** | Placeholder shape with shimmer gradient |
| **Spinner** | Rotating codicon glyph |

---

## Progress bar

| Property | Token / value |
|---|---|
| Height | 2px |
| Fill color | `--vscode-progressBar-background` |
| Track | transparent (bar only draws the fill) |
| Accessible name | `role="progressbar"` + `aria-label` on the bar element — required for determinate and indeterminate alike |

### Determinate

Fill width reflects percent complete; no transition beyond a short width tween (`motion-duration-fast`, see `foundation/motion.md`).

### Indeterminate

A short fill segment slides continuously left-to-right across the 2px track. Respect `body.vscode-reduce-motion`: swap the slide for a static/pulsing fill at `motion-duration-instant` instead of a moving animation.

---

## Skeleton shimmer

Cards convention for content placeholders.

| Property | Value |
|---|---|
| Gradient | Between `--vscode-editor-background` and `--vscode-list-hoverBackground` |
| Motion | Gradient position sweeps continuously, ~1.5s per full cycle (ambient loops are exempt from the ≤150ms interaction cap) |
| Radius | Match the content shape it stands in for (see `foundation/radius.md`) |
| Reduced motion | Static mid-gradient fill, no sweep, under `body.vscode-reduce-motion` |
| High contrast | `background: transparent; border: 1px solid var(--vscode-contrastBorder)`, shimmer suppressed (gradient stops go invisible in HC) |

---

## Spinner

| Property | Value |
|---|---|
| Glyph | `codicon codicon-loading` (see `components/codicons.md`) |
| Modifier | `codicon-modifier-spin` |
| Color | `--vscode-icon-foreground` or `currentColor` |
| Motion | Continuous rotation; reduced-motion still spins (a static loading glyph implies frozen, not loading) unless paired with a text/`aria-live` cue |

---

## Variants

### Determinate bar

Known percent — width reflects value; expose via `aria-valuenow`.

### Indeterminate bar

Unknown duration — sliding segment loop.

### Skeleton

Content-shaped shimmer block(s) standing in for not-yet-loaded rows/cards.

### Inline spinner

Small rotating codicon beside a label (e.g. "Syncing…").

---

## States

| State | Treatment |
|---|---|
| Complete | Bar/skeleton removed, real content shown |
| Reduced motion (bar) | Slide replaced by static/pulsing fill |
| Reduced motion (skeleton) | Sweep replaced by static mid-gradient |
| High contrast (skeleton) | Bordered transparent placeholder (`--vscode-contrastBorder`), no shimmer |
| Reduced motion (spinner) | Keep spinning, or pair with explicit `aria-live` progress text if frozen |

---

## Accessibility

- Progress bar: `role="progressbar"`; determinate sets `aria-valuenow`/`-valuemin`/`-valuemax`; indeterminate omits `aria-valuenow`.
- Announce loading start/end via `aria-live="polite"` on the surrounding region, not the bar itself — give that region `role="status"` first; ARIA prohibits `aria-label` on a role-less `div`.
- Skeletons are decorative — mark `aria-hidden="true"` and give the loading region its own accessible loading label.
- Spinner-only indicators need an adjacent label or `aria-label` describing what's loading.

---

## Prohibited

- No progress bar taller than 2px.
- No literal hex — fill is `--vscode-progressBar-background`; skeleton gradient stops are `--vscode-editor-background`/`--vscode-list-hoverBackground`.
- No motion that ignores `body.vscode-reduce-motion`.
- No mixing icon fonts for the spinner — codicon only (see `components/codicons.md`).
- No skeleton shimmer left in place after content loads (must be removed/swapped, not hidden under content).
- No gradient shimmer in high contrast — HC skeletons are bordered transparent placeholders (see Skeleton table).
