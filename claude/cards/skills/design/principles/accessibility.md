# Accessibility Principles — Contrast, Focus, Perception & Interaction

Agent-ready accessibility rules derived from WCAG 2.1/2.2 (AA baseline, AAA where noted), adapted for VSCode webviews and card-embedded HTML. Colors here are never raw hex — they come from the user's active VS Code theme via `--vscode-*` variables (see `foundation/colors.md`), so most contrast obligations reduce to "use the right variable pair," not "compute a ratio."

---

## 0. How agents must use this document

1. **Accessibility overrides everything.** When a rule here conflicts with a visual preference, accessibility wins.
2. **Never invent color.** Every foreground/background comes from `--vscode-*` or `--cards-status-*`. A hardcoded hex bypasses the user's theme and cannot be verified for contrast.
3. **Pair theme variables correctly — never mix pairs.** Each surface role ships a matched foreground/background pair (`button-background` + `button-foreground`, `list-hoverBackground` + `list-hoverForeground`, `input-background` + `input-foreground`). Using one role's background with another role's foreground breaks the theme author's contrast guarantee. This is the primary contrast rule for this domain.
4. **Disabled is not exempt from perception.** A disabled control must still be visibly present (see `--vscode-disabledForeground`), even though it's exempt from AA minimums.

---

## 1. Contrast

### 1.1 Paired variables are pre-verified

VS Code theme authors are responsible for ensuring each variable pair meets WCAG contrast. An agent using `var(--vscode-button-background)` with `var(--vscode-button-foreground)` inherits that guarantee across every installed theme, including high-contrast ones. Do not compute contrast ratios for correctly paired variables — verify instead that the pairing is correct (see `foundation/colors.md` for the full pair list).

Caveat: the guarantee is *pair fidelity*, not a hard AA ratio — some default light-theme pairs measure sub-AA (e.g. 3.3–4.4:1 on secondary text). That is a theme trait, not yours to fix; but never stack additional contrast loss (opacity, lighter weight, smaller size) onto a paired combination that is already marginal.

### 1.2 What still needs manual contrast verification

- **`--vscode-charts-*`** — not a guaranteed pair; when placing chart-color text/fills against `--vscode-editor-background` or a widget background, verify contrast still holds across light, dark, and HC themes.
- **`--cards-status-*`** — theme-invariant hexes (see `foundation/colors.md`) laid over a theme-variable surface. Verify against the specific surface each status color is used on. Filled status badges never take a theme variable as text — the fill is invariant, so the text is a fixed literal per status (`components/badges.md`); a theme variable would fail contrast in one polarity.
- **Any custom composition** that pairs a variable from one role with a variable (or literal) from another.

### 1.3 Agent rules — contrast

- **DO** use matched variable pairs for every foreground/background combination.
- **DO** verify `--vscode-charts-*` and `--cards-status-*` usages manually per §1.2.
- **DO NOT** hardcode hex colors for text or backgrounds — it breaks theme adaptation and cannot inherit the contrast guarantee.
- **DO NOT** assume a pairing is safe just because it "looks fine" in one theme — test dark, light, and at least one high-contrast theme.

---

## 2. Color as Information — SC 1.4.1 (A)

Color must never be the only channel conveying information, action, or state.

| Situation | Fails | Passes |
|---|---|---|
| Error state | Red input border alone | Red border + `--vscode-inputValidation-errorBackground` box + text message |
| Status | Color-only status dot | `--cards-status-*` color + icon + label ("To Do", "Active"…) |
| Selected list row | Background color only | Background (`list-activeSelectionBackground`) + `aria-selected` + often a checkmark |
| Chart series | Different `--vscode-charts-*` colors only | Colors + distinct dash pattern/shape + legend labels |

### Agent rules — color as information

- **DO** pair every color-encoded meaning with an icon, label, or shape.
- **DO** ensure two colors encoding different meanings differ enough in lightness to read even without hue (protanopia/deuteranopia safety net), ≥ 3:1 between them where feasible.
- **DO NOT** rely on `--cards-status-*` color alone to distinguish statuses — always pair with the status label.
- **DO NOT** identify required fields or validation errors by color alone.

---

## 3. Focus Visibility — SC 2.4.7 (AA), SC 2.4.11/2.4.13 (WCAG 2.2)

### 3.1 The webview focus contract

The default webview stylesheet already provides `outline: 1px solid -webkit-focus-ring-color; outline-offset: -1px` on everything. Components override this with the theme-correct variable, never with a box-shadow ring.

| Property | Value |
|---|---|
| Style | `outline: 1px solid var(--vscode-focusBorder)` |
| Offset | `-1px` default (list rows, menu items, tabs); `2px` for standalone controls — buttons, checkboxes/radios, inputs, selects (matching their component docs) |
| Contrast | Guaranteed by the theme's `focusBorder` value |
| Animation | None — must appear instantly |

### 3.2 Agent rules — focus

- **DO** use `outline` with `var(--vscode-focusBorder)` for every focusable custom element.
- **DO** use `:focus-visible` so mouse clicks don't show the ring but keyboard nav does.
- **DO** keep the focus treatment identical across all interactive elements.
- **DO** restore focus programmatically after a re-render, panel refresh, or dialog close.
- **DO NOT** use `box-shadow` for a focus ring — VS Code's own controls never do, and it breaks the HC theme's border-based visibility pattern.
- **DO NOT** use `outline: none` without a replacement outline.
- **DO NOT** animate the focus ring's appearance.

---

## 4. Keyboard Accessibility — SC 2.1.1 / 2.1.2 (A)

- **DO** ensure every interactive element is reachable via Tab / Shift+Tab, in an order matching visual layout.
- **DO** ensure buttons activate on Space and Enter; links activate on Enter.
- **DO** trap focus inside dialogs/quick-input overlays (`components/dialogs.md`) until dismissed, then return focus to the trigger.
- **DO NOT** use `tabindex` > 0.
- **DO NOT** rely on hover-only affordances — the webview may be driven entirely by keyboard or `vscode-using-screen-reader`.
- **DO NOT** use `pointer-events: none` as a substitute for `disabled` — it hides the element from keyboard and AT.

---

## 5. Motion and Animation Safety — SC 2.3.1 (A) / 2.3.3 (AAA)

VS Code exposes reduced motion as a body class, not only a media query.

- **DO** gate all transitions/animations on `body:not(.vscode-reduce-motion)`, in addition to (or instead of) `@media (prefers-reduced-motion: reduce)`.
- **DO** provide a static end-state for every animation.
- **DO** keep state transitions within `foundation/motion.md`'s duration tokens.
- **DO NOT** use `animation-iteration-count: infinite` on content-bearing elements without a pause mechanism.
- **DO NOT** flash or strobe any element.

---

## 6. Target Size — SC 2.5.8 (AA, WCAG 2.2)

| Standard | Minimum |
|---|---|
| WCAG 2.2 SC 2.5.8 | 24 × 24 px — absolute floor |
| VS Code convention | List rows: 22px (established platform pattern, not a violation); buttons/inputs: ~26px tall including border |

Desktop mouse/trackpad is the primary input; touch is secondary. Meet the 24×24 floor through padding, not text size alone, especially for icon-only toolbar buttons.

### Agent rules — target size

- **DO** size icon-only buttons with enough padding to clear 24×24px hit area even when the icon itself is 16px.
- **DO** add spacing between adjacent icon-button groups per `foundation/spacing.md`'s icon-button gap token.
- **DO NOT** shrink interactive elements below the 24×24 floor to save space.

---

## 7. Content on Hover or Focus — SC 1.4.13 (AA)

Applies to tooltips (`components/tooltips.md`), dropdown menus, and hover cards.

- **DO** keep tooltip content visible when the pointer moves into it.
- **DO** allow Escape to dismiss any hover/focus-triggered content.
- **DO** trigger on focus wherever hover triggers, for keyboard parity.
- **DO NOT** use `mouseout` to hide instantly — add a short delay or hoverable bridge.

---

## 8. Semantic Structure — SC 1.3.1 (A) / SC 2.4.6 (AA)

- **DO** use real `<h1>`–`<h6>` elements; never skip levels.
- **DO** use `<button>` for actions and `<a>` for navigation/links — never swap them. This is the one place this rule is stated; `implementation-hygiene.md` and `interaction-and-ux-laws.md` reference it rather than restate it.
- **DO** associate every form `<input>` with a `<label>` — `aria-label` is a fallback, not a replacement.
- **DO** label vscode-elements form components (`<vscode-textfield>`, `<vscode-single-select>`, …) via the component's own `label` attribute/slot or `aria-label` on the host — `label[for]` cannot reach the input inside their shadow DOM, so a page that relies on it fails AT silently despite looking labeled.
- **DO** label landmark/region elements when there are multiples.
- **DO NOT** use `<div role="button">` when a real `<button>` works.
- **DO NOT** break words across inline elements — screen readers read them as separate words.

---

## 9. Text Resizing & Reflow — SC 1.4.4 / 1.4.10 (AA)

Card-HTML pages render in a fixed-size iframe the user does not zoom independently; extension webview panels resize with the editor/sidebar width, not with browser zoom.

- **DO** keep font sizes on `foundation/typography.md`'s literal-px ramp — the host scales type via `--vscode-font-size`; no independent browser zoom exists here, so px is correct and rem/em is not.
- **DO** let panel content reflow to narrow widths (sidebar-docked webviews can be < 300px) — no fixed-width layouts that force horizontal scroll.
- **DO NOT** clip or hide content at narrow panel widths.

---

## 10. Design System Pairing Checklist

Run against every custom component before shipping.

- [ ] Every text/background pair uses a matched theme variable pair, not a mixed combination
- [ ] `--vscode-charts-*` and `--cards-status-*` usages manually contrast-checked per §1.2
- [ ] Focus indicator is `outline` with `var(--vscode-focusBorder)`, never `box-shadow`
- [ ] Every color-encoded meaning has a non-color channel (icon, label, pattern)
- [ ] Disabled elements use `--vscode-disabledForeground`, remain visible, and are marked `disabled`/`aria-disabled`
- [ ] All animation respects `body.vscode-reduce-motion`
- [ ] All interactive elements reachable and operable by keyboard

---

## 11. Conflict Resolution

1. **Accessibility wins over aesthetics.**
2. **Accessibility wins over theme fidelity — but stay inside the variable system.** If a themed pairing somehow fails contrast in a specific theme, that is a theme bug, not license to hardcode a fix; flag it rather than introducing a raw hex.
3. **Accessibility wins over density.** If a 24×24px target needs more padding, padding wins.
4. **Never introduce colors outside `--vscode-*` / `--cards-status-*`.**
