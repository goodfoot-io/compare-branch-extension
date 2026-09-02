# Interaction & Control Principles

Universal interaction principles — cognitive laws, 30 UX laws, form design, feedback/errors, and button/control state contracts — adapted for VSCode webviews and card-embedded HTML. Concrete pixel values live in `foundation/spacing.md` and `foundation/typography.md`; this file states the behavioral contract and cross-references those tokens.

---

# Cognitive Principles

- **Fitts' Law** — primary actions large and reachable; destructive actions smaller and distanced. Touch/click target minimums: `foundation/spacing.md`, `accessibility.md` §Target Size.
- **Hick's Law** — decision time increases with choice count. Limit choices per panel; use progressive disclosure (collapsed sections, secondary menus) for advanced options.
- **Gestalt principles** — proximity, similarity, and common region create grouping within a panel.

# Form Design Principles

- **Single-column forms** scan faster than multi-column, especially in narrow sidebar-docked panels.
- **Bordered fields** (`--vscode-input-border`) read as inputs faster than underline-only fields.
- A label sits closer to its field than to the previous field's label.
- When an input's fill matches its parent surface, it must still show a visible `--vscode-input-border` at rest, not only on focus.
- Mark optional fields rather than scattering required asterisks.
- Show constraints inline as the user types, not only after submit fails.
- Only the primary button gets `--vscode-button-background`; secondary actions use `--vscode-button-secondaryBackground` or a ghost/outline treatment.
- In an input+button row, match total heights exactly (`layout-and-hierarchy.md` Appendix).
- Button labels stay on one line; buttons never shrink in a shared row.
- Primary action goes right (LTR) in a row, bottom in a stacked layout.
- Toggles (`<vscode-checkbox>` switch variant) are for settings that take immediate effect; checkboxes are for choices confirmed by a separate action. Don't mix them.
- On mobile-width panels, prefer a stacked cell view over horizontal table scroll.
- Left-align text; right-align numbers in tables.
- Name wizard steps clearly; make completed steps clickable.
- Don't hide invalid fields inside collapsed sections — expand and scroll to the error.

# Feedback and Errors

- Every action produces feedback — silent failures erode trust.
- Errors explain the problem and offer a next step ("Email already used — log in instead?" not "Unknown error").
- Loading states set expectations: determinate progress bar for measurable waits, skeleton for predictable content, spinner only for short indeterminate waits.

## Agent rules — interaction

- **DO** define trigger → action → feedback → resolution for every interactive element.
- **DO** apply Fitts' and Hick's Laws.
- **DO** use single-column forms with clear label-to-field proximity.
- **DO** match input height to adjacent buttons in the same row.
- **DO NOT** create interactions without feedback.
- **DO NOT** break VS Code platform conventions without a documented reason.
- **DO NOT** use vague button labels ("OK", "Next") — name the specific action.

---

# UX Laws

A consolidated ruleset for producing, reviewing, or refactoring webview/card UI.

## How agents must use this section

1. Treat each law as a constraint. If violated, fix it or state the trade-off explicitly.
2. Consider the whole list — over-applying one law causes real failures.
3. Prefer subtraction before addition: check Occam's Razor, Hick's Law, Choice Overload first.
4. Familiarity (Jakob's Law) beats cleverness — match VS Code's own conventions.
5. Accessibility, motion-sensitivity, and contrast requirements override all of these — see `accessibility.md`.

## Universal rules (TL;DR)

1. One primary action per panel/surface.
2. Group related things; separate unrelated things (proximity, common region, similarity).
3. ≤ 5 options per decision point unless the task is comparison.
4. Hide complexity behind progressive disclosure; don't delete it (Tesler's Law).
5. Match VS Code conventions first, innovate second.
6. Feedback within 100ms; complete or show progress within 400ms.
7. Multi-step flows show progress, a clear entry, and an unmistakable end state.
8. Reduce memory load: keep prior choices and entered values visible across steps.
9. Be liberal in what you accept, strict in what you emit.
10. Never rely on color alone — see `accessibility.md` §Color as Information.
11. Respect `vscode-reduce-motion` and locale.

## The 30 laws

| Law | Rule |
|---|---|
| **Aesthetic-Usability Effect** | A coherent, theme-correct surface reads as more usable and buys tolerance for minor issues — but polish never disguises broken IA. Don't ship 3 button styles for the same role. |
| **Choice Overload** | Cap visible choices at a decision point to ≤ 5; group/filter/recommend beyond that. Provide a default. |
| **Chunking** | Break content into visually distinct groups (5–9 items) with headings or separators. Don't chunk arbitrarily. |
| **Cognitive Bias** | Anticipate anchoring, loss aversion, recency in copy and defaults. Never design dark patterns — no preselected destructive defaults, no confirmshaming. |
| **Cognitive Load** | Strip extraneous load: redundant copy, look-alike controls, unnecessary fields. Carry context across panel views. |
| **Doherty Threshold** | Acknowledge input within 100ms; determinate progress within 400ms for anything over 1s. Use skeletons, not blank states. |
| **Fitts's Law** | Size targets per `foundation/spacing.md` / `accessibility.md` §Target Size. Make the whole row clickable, not just an inner label. Never place destructive next to primary at equal size. |
| **Flow** | Low-intrusion feedback (autosave indicator) during focused tasks; no modal interruptions mid-task. |
| **Goal-Gradient Effect** | Show progress for tasks ≥ 3 steps or unknown duration. Never fake progress. |
| **Hick's Law** | Reduce options at every branch; break complex choices into sequential simpler ones; default the non-trivial choice. |
| **Jakob's Law** | Use VS Code's own conventions by default — command palette patterns, settings-row layout, standard iconography. Never invent a new gesture for a common action. |
| **Law of Common Region** | Use panels/cards/borders to group related controls; don't nest more than two levels without a hierarchy reason. |
| **Law of Proximity** | Label adjacent to its input; error adjacent to its field. ~2× spacing ratio between groups vs. within a group (`foundation/spacing.md`). |
| **Law of Prägnanz** | Prefer regular geometry and aligned grids; remove visual noise; no ambiguous icons requiring legend lookups. |
| **Law of Similarity** | One visual style per semantic role — all primary buttons identical. Differentiate clickable from non-clickable text. |
| **Law of Uniform Connectedness** | Use a row stripe or hover band to bind table row columns; a connecting underline for active tabs. Don't over-connect. |
| **Mental Model** | Use the user's vocabulary (card, status), not internal schema terms. Don't assume your model matches theirs. |
| **Miller's Law** | Chunk lists/menus into 5–9 item groups; paginate or filter longer lists. Not a hard cap on total visible items. |
| **Occam's Razor** | Remove elements that don't add function. Don't delete error/empty states because they "look extra". |
| **Paradox of the Active User** | Usable with zero docs: inline tooltips and empty-state guidance, not a manual. Provide undo where feasible. |
| **Pareto Principle** | Design the top 20% of flows by usage disproportionately well; don't abandon the long tail (often accessibility-dependent). |
| **Parkinson's Law** | Pre-fill/autofill known data; let users skip non-essential steps. |
| **Peak-End Rule** | Polish the end state of every flow; never end on a generic dead-end or leave an error as the last thing shown. |
| **Postel's Law** | Accept input in any reasonable format, normalize silently; don't reject on whitespace/case differences alone. |
| **Selective Attention** | Reduce competing stimuli around the primary action; don't rely on a single passive notification for critical info. |
| **Serial Position Effect** | Put the most important items first and last in a list; don't bury the primary action in the middle. |
| **Tesler's Law** | Absorb complexity via smart defaults/automation rather than amputating functionality. |
| **Von Restorff Effect** | Style the primary action distinctively; highlight at most one recommended option — never rely on color alone to isolate it. |
| **Working Memory** | Carry context between steps; never make the user retype or re-select. Persist filters/sort/selection. |
| **Zeigarnik Effect** | Show progress meters for unfinished tasks; save and resume state — never lose it on refresh. |

## Resolving conflicts between laws

1. Accessibility & ethics override everything.
2. Mental Model & Jakob's Law before stylistic differentiation.
3. Tesler's Law caps over-simplification.
4. Cognitive Load & Selective Attention beat Aesthetic-Usability.
5. Postel's Law beats strict validation when intent is clear.
6. Von Restorff trumps Similarity only for the primary action — never for many.

---

# Button & Control States

The interactive states a button can occupy. VS Code buttons use background-swap feedback only — no shadows, elevation, or transform on hover/active; those are workbench-native conventions, not brand expression.

## How agents must use this section

1. Treat each rule as a constraint.
2. A button ships as a full state set, not just its default appearance.
3. Never suppress focus — see `accessibility.md` §Focus Visibility.
4. Links are not buttons. A navigation `<a href>` never gets background fills, borders, or scale transforms — text-only styling with a hover/active color change and `:focus-visible`. If it goes somewhere, it's a link; if it does something, it's a button.

## Universal rules (TL;DR)

1. Every button wires up default, hover, active, focus, disabled at minimum.
2. Focus is `outline: 1px solid var(--vscode-focusBorder)`, always — never `outline: none` without a replacement.
3. Hover and active are both background-color swaps — no elevation, glow, gradient, or scale.
4. Disabled: `opacity: 0.4`, `cursor: not-allowed`, native `disabled` attribute.
5. Loading disables the button — never allow re-clicks mid-request.
6. Color is never the sole channel for state.
7. Transitions land at 100–150ms; instant (0ms) for focus.
8. A primary button is visually distinct from every secondary on the same surface via `--vscode-button-background` vs. `--vscode-button-secondaryBackground`, never by resizing.
9. Respect `body.vscode-reduce-motion` — drop any transition to an instant color swap.

## The five core states

**Default** — recognizable as interactive via VS Code's paired button variables (`foundation/colors.md`). Verb-first labels ("Save changes", not "Changes").

**Hover** — swap `background` to the paired `-hoverBackground` variable (`button-hoverBackground`, `list-hoverBackground`, etc.). That is the only sanctioned hover technique for this domain — no shadow, no transform, no glow. Transition 100–150ms `ease-out`. Cursor `pointer`. HC themes suppress hover backgrounds entirely — don't fight that; on list/menu rows replace it with the dashed `--vscode-contrastActiveBorder` outline (`components/list-rows.md`), and on buttons rely on the always-visible border.

**Active (pressed)** — deepen the background one step further, or apply the theme's active-selection variable where one exists (e.g. `list-activeSelectionBackground`). `:active` clears the outline. No `transform: scale()`, no inset shadow — those aren't part of the VS Code control language.

**Focus** — `outline: 1px solid var(--vscode-focusBorder)`, offset `-1px` (or `2px` on buttons/checkboxes). Use `:focus-visible`. Never animate the ring's appearance; never let it disappear behind hover/active fills.

**Disabled** — `opacity: 0.4`, `cursor: not-allowed`, native `disabled`/`aria-disabled`. Pair with an inline reason where feasible. Never hide the control entirely.

## The four functional states

**Loading** — disable the button (`pointer-events: none`, `aria-busy="true"`), keep its width, replace or accompany the label with a spinner (< 1s) or determinate progress (> 1s, measurable). Restore default immediately on resolution.

**Success** — success-colored icon/label change, past-tense copy ("Saved"). Hold 1.5–3s then return to default. Announce via `aria-live="polite"`.

**Error** — pair `--vscode-inputValidation-errorBorder`/`-errorBackground` with inline recovery text. Reset to clickable so the user can retry. `role="alert"` when blocking, `polite` otherwise.

**Selected/Toggled** — filled/inverted style clearly distinct from default (`aria-pressed`/`aria-checked`), persists until explicitly toggled off. Not for momentary actions (that's success).

## State transitions & motion

| Transition | Duration | Notes |
|---|---|---|
| Default → Hover | 100–150ms ease-out | Background swap only |
| Hover → Active | 80–120ms ease-out | Faster than hover |
| Any → Focus | 0ms | Instant, never animated |
| Loading → Success/Error | 150–300ms | Brief, don't dwell |
| Default → Disabled | 150ms | Opacity fade only |

Respect `body.vscode-reduce-motion`: collapse all of the above to instant color swaps.

## Cross-platform & input-modality

**Mouse (desktop, primary case)** — all states fire; hover carries meaningful weight; `:focus-visible` hides the ring on click.

**Keyboard** — focus is the cursor, always visible; Space/Enter activate `<button>`; Tab order matches visual order.

**Screen reader (`vscode-using-screen-reader`)** — every button has an accessible name matching its visible label; state changes announced via `aria-live`/`aria-busy`/`aria-pressed`.

## State implementation contract

| State | Visual change | Trigger | A11y hook |
|---|---|---|---|
| Default | Paired theme variables | Mount | Native role |
| Hover | `-hoverBackground` swap | Pointer enters | None (pointer-only) |
| Active | Deeper background | Press/Space/Enter | None (transient) |
| Focus | `focusBorder` outline | Keyboard focus | Native focus preserved |
| Disabled | `opacity: 0.4`, not-allowed | Programmatic | `disabled`/`aria-disabled` |
| Loading | Spinner/progress, same width | Action dispatched | `aria-busy` |
| Success | Icon + past-tense label | Resolved positively | `aria-live="polite"` |
| Error | Error border/icon + message | Resolved negatively | `role="alert"` or `aria-live` |
| Selected | Inverted/filled, persists | User toggles | `aria-pressed`/`aria-checked` |

## Accessibility baseline for controls

Full detail in `accessibility.md`: label vs. fill contrast via paired variables in every state; visible focus outline; color never the sole channel; touch/click targets meet `accessibility.md` §Target Size; every state keyboard-reachable; `aria-disabled`/`aria-busy`/`aria-pressed`/`aria-live` wired per state; reduced motion respected.

## Resolving conflicts between rules

1. Accessibility & WCAG 2.2 override everything.
2. Focus visibility before restraint — never suppress the ring.
3. Single primary per surface before novelty.
4. Consistency across the system before per-surface optimization.
5. Recovery in error states before polished copy.
