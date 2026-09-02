# Layout & Hierarchy Principles

> The reasoning layer for visual hierarchy, layout structure, depth, and adaptive sizing in VSCode webviews and card-embedded HTML. Concrete values (spacing, radii, breakpoints) live in `foundation/*.md` — this file states which relationship to apply where, and the formulas that convert a foundation token into a derived value. Never restate a foundation number here.

---

# Pillar 1 — Constraints

## 1.1 What are design constraints?

Constraints (host panel, medium, theme, accessibility) are the starting point, not the obstacle.

## 1.2 Constraint categories

| Category | What it covers |
|---|---|
| **Problem / audience** | Cards users and Cards-extension developers; task literacy, not general-public literacy. |
| **Device / medium** | Panel width (sidebar-docked webviews can be < 300px; editor-tab webviews can be wide), the CSP-sandboxed card iframe, no network in card HTML beyond the sanctioned CDN scripts. |
| **Theme** | The active VS Code theme (light/dark/HC) and `vscode-reduce-motion` — never a fixed brand palette. |
| **Accessibility** | WCAG 2.2 AA, HC theme border patterns, `vscode-using-screen-reader`. |
| **Platform** | VS Code's own component language (`components/*.md`), `@vscode-elements/elements`, Tailwind utility classes. |

## 1.3 Start with a feature, not a shell

Design the actual panel content or card first — the shell (headers, section chrome) is designed once the content it must contain is known. Ship the smallest useful version.

## 1.4 Agent rules — constraints

- **DO** identify panel-width and theme constraints before generating any layout.
- **DO** treat accessibility as a constraint from the first pass, not a polish step.
- **DO NOT** design for a fixed viewport width — panels and card iframes resize independently of the browser/OS.

---

# Pillar 2 — Hierarchy & Emphasis

## 2.1 What is visual hierarchy?

Controls where the eye goes first, second, third. Test by squinting or shrinking to thumbnail — if the primary element isn't still obvious, hierarchy is broken.

## 2.2 Core hierarchy principles

**Alignment** — pick one axis (left edge in LTR) and lock every heading, row, and control to it.

**Color** — build hierarchy on the theme's own foreground weight, not hue: `--vscode-foreground` for primary text, `--vscode-descriptionForeground` for secondary/metadata. Never introduce a color outside the paired variable system to create emphasis (see `accessibility.md` §1).

**Contrast** — the *difference* between adjacent elements in size, weight, or density. A `label3`-weight heading beats `body1` regular on contrast alone, before size registers (`foundation/typography.md`).

**Proximity** — tighter within a group than between groups; the ratio is the grouping signal (`foundation/spacing.md`).

**Size** — build hierarchy as a ratio between the typography ramp's steps (`foundation/typography.md`), not absolute pixels.

**Time (motion)** — motion signals importance only for entrance/feedback/transition, gated by `vscode-reduce-motion` (`foundation/motion.md`).

## 2.3 Hierarchy through emphasis and de-emphasis

**Emphasize by de-emphasizing** — when the main element doesn't stand out, soften the competitors (`--vscode-descriptionForeground` instead of `--vscode-foreground`) rather than making the target louder.

**Labels are secondary to data** — omit the label when context is self-explanatory; combine label+value ("3 active"); when both must show, de-emphasize the label.

**Progressive disclosure** — sequence information so the panel shows only what's needed now; always signal that more exists (a chevron, a "Show details" affordance).

**Semantic ≠ visual hierarchy** — heading levels exist for accessibility; style for visual hierarchy separately. An `<h1>` in a settings panel may render at `label1` size.

## 2.4 Button & action hierarchy

- **Primary** — `--vscode-button-background` fill.
- **Secondary** — `--vscode-button-secondaryBackground` or outline.
- **Tertiary** — text-link styling.
- Destructive actions aren't automatically loud — secondary/tertiary styling unless destructive *is* the primary action, combined with a confirmation step.

## 2.5 Agent rules — hierarchy

- **DO** identify the single most important element on every panel/card and ensure it dominates.
- **DO** use no more than 3–4 hierarchical levels per surface.
- **DO** apply Gestalt grouping (proximity, alignment, similarity, common region).
- **DO** validate hierarchy by squinting — the primary element should still read first.
- **DO** build size hierarchy as ratios from the typography ramp, not absolute pixels.
- **DO NOT** rely on color alone for hierarchy.
- **DO NOT** make every element compete for attention.
- **DO NOT** hide information the user needs *now* behind progressive disclosure.

---

# Pillar 3 — Layout

## 3.1 You do not have to fill the whole panel

If a component needs a narrow width, give it that width. Stretching to fill a wide editor-tab webview makes content harder to parse — split into columns instead.

## 3.2 Grids are a tool, not a religion

- Sidebars/rails get a fixed width sized to content; the main area flexes.
- Cards, dialogs, and forms get a max-width and shrink only when the panel forces it.

## 3.3 Canonical layouts for this domain

| Layout | Best for | Watch out |
|---|---|---|
| **Block (single column)** | Card HTML body content, settings panels | Needs typography rhythm to avoid monotony. |
| **List/row grid** | List rows, table-like data (`components/list-rows.md`, `components/tables.md`) | Too many columns collapses badly in narrow sidebars. |
| **Modular grid** | Dashboards, multi-card panels | Mixed-size modules need clear hierarchy. |

Panel/widget grids use the `foundation/spacing.md` row-gap/item-gap tokens for both directions.

## 3.4 Hard vs. soft grids

Prefer a **soft grid** — consistent spacing and column alignment without baseline snapping — for nearly everything in this domain; panels resize too unpredictably for a hard editorial grid.

## 3.5 Spacing for typography and sections

- Heading-to-body distance is tighter than section-to-section distance (`foundation/typography.md`).
- Within a group, elements sit close; between groups, noticeably more space.
- Start generous, then tighten.
- Never use equal spacing everywhere — it collapses hierarchy.

## 3.6 Grouping: space before lines

Spacing (proximity) is the primary grouping tool. Use borders/dividers/panel backgrounds only when proximity alone is ambiguous — and even then, prefer `--vscode-panel-border` at 1px over a heavier treatment. Don't add a divider between elements already grouped by proximity.

## 3.7 Agent rules — layout

- **DO** give each element the space it needs; don't stretch to fill a wide panel.
- **DO** choose a layout type per surface and justify the choice.
- **DO** use proximity as the primary grouping mechanism.
- **DO NOT** rely on a grid as the only layout tool — combine with max-widths.
- **DO NOT** use equal spacing everywhere.
- **DO NOT** add borders/dividers when proximity alone communicates grouping.

---

# Pillar 6 — Depth & Visual Polish

## 6.1 Elevation conveys meaning

VS Code has no native elevation system for webviews — shadows are self-defined per `foundation/shadows.md` and reserved for genuinely floating layers:

- **Flat** (no shadow): body content, panels, cards at rest.
- **Floating** (`0 0 12px rgba(0,0,0,0.14)`): dropdown menus, tooltips.
- **High above** (`0 0 20px rgba(0,0,0,0.15)`): dialogs, modal overlays.

The same shadow must map to the same attention-priority everywhere — don't reuse the dialog shadow on a hover card.

## 6.2 Depth without shadows

- **Overlap** — one element overlapping another instantly reads front-to-back.
- **Background layering** — `--vscode-editorWidget-background` over `--vscode-editor-background` reads as "above" without a shadow.

## 6.3 Use fewer borders

Prefer spacing or background-color contrast over borders for separation. Where a border is needed for the HC theme's sake, declare it as `1px solid var(--vscode-*-border, transparent)` (`foundation/colors.md` §HC pattern) — invisible in normal themes, visible in HC.

### Nested border radius

```
innerRadius + distance = outerRadius
```

`distance` is the gap between curves — typically the parent's padding. Apply to cards wrapping content, dialogs wrapping panels, any nested `border-radius` pair. Radius values: `foundation/radius.md`.

## 6.4 Design empty states

Guide the user toward their first action: a clear message plus a call-to-action. Hide supporting UI (filters, tabs) that has no function until content exists.

## 6.5 Skeleton screens over spinners

For predictable-shape content (lists, cards), use skeleton placeholders instead of a generic spinner (`components/progress.md`).

## 6.6 Agent rules — depth & polish

- **DO** map shadow weight to attention-priority consistently.
- **DO** prefer spacing/background contrast over borders; use the HC transparent-border pattern where a border is structurally needed.
- **DO** calculate nested inner `border-radius` as `outerRadius − padding`.
- **DO** design empty states as onboarding opportunities.
- **DO NOT** use shadows as decoration disconnected from elevation meaning.
- **DO NOT** reuse a parent's border-radius on a padded inner child without subtracting the gap.

---

# Pillar 8 — Adaptive Sizing

> This is not "responsive/mobile" design — VS Code webviews and card iframes never see a phone. They resize because the *panel* resizes: sidebar-docked, editor-tab, or a narrow detail rail.

## 8.1 Panel-first thinking

Design for the narrowest realistic panel first (sidebar-docked, ~260–320px), then confirm the layout still works wide (editor-tab, unconstrained).

## 8.2 Content decides breakpoints

Breakpoints exist where content stops being usable — test with the longest realistic label/value, not the average.

## 8.3 Components respond to their container, not the panel

A reusable component doesn't know whether it's in a sidebar rail or a wide editor-tab webview. Use container queries or flex/grid sizing driven by the component's own wrapper, not `100vw`-style viewport assumptions.

## 8.4 Pointer awareness

- Meet `accessibility.md` §Target Size regardless of input device.
- Provide keyboard equivalents for every pointer interaction (VS Code users are keyboard-heavy).
- Hover is not guaranteed: any hover-only content must also open on focus/click, since `vscode-using-screen-reader` and touch-capable setups both lack real hover.

## 8.5 Agent rules — adaptive sizing

- **DO** design panel-first: narrowest realistic width as the base case.
- **DO** let content, not device names, determine collapse points.
- **DO** make components respond to their own container's width.
- **DO** provide non-hover fallbacks for every hover interaction.
- **DO NOT** assume a wide viewport — sidebar-docked panels are a first-class case, not an edge case.
- **DO NOT** rely on hover alone for essential content or controls.

---

# Pillar 9 — Consistency

## 9.1 External consistency — match VS Code's own conventions

Users bring conventions from the rest of the editor to every panel and card: command-palette patterns, settings-row layout, standard codicon iconography, native `<select>`/checkbox look. Breaking too many trades recognizability for unwanted novelty.

## 9.2 Cohesiveness — one voice from start to finish

Density, copy tone, and interaction pattern should feel identical between a card HTML page and an extension webview panel — a user should not be able to tell, from feel alone, which context they're in (`contexts.md` covers where the two legitimately differ).

## 9.3 Agent rules — consistency

- **DO** place elements where VS Code convention expects them (actions in a toolbar, not buried in a menu the workbench itself wouldn't use).
- **DO** follow established interaction conventions (Enter submits, Escape dismisses).
- **DO** hold one consistent density and voice across card HTML and webview surfaces.
- **DO NOT** invent a novel pattern for a problem VS Code has already solved.
- **DO NOT** let one surface shed the density/voice of the rest.

---

## Appendix — Non-negotiable Component & Surface Rules

Concrete constraints that don't reduce to one of the pillars above — they override conflicting guidance elsewhere in this document.

### Badges are never full width

Badges are inline, content-sized — hug their label/icon, never `width: 100%`. A full-row element is an alert or list row, not a badge (`components/badges.md`).

### Inputs on matching backgrounds need visible contrast

When an input's fill nearly matches its parent surface, lighten/darken the input background and border relative to the parent using the next `--vscode-input-*` step — never a raw hex. Must hold in default, hover, focus, and error states; a focus ring alone isn't a substitute for a visible field at rest.

### Nested border radius must be calculated, not guessed

See §6.3 above.

### Input + button rows must share height

When an input and button sit side by side, both match total box height exactly, including padding and border. Derive the input height from the button height token in `foundation/spacing.md`. Stacked layouts are exempt.

### Icon inset on inputs must balance both sides

`textPaddingStart = iconInset + iconWidth + iconInset`, with `size60` (6px, `foundation/spacing.md`) as the icon inset. Asymmetric spacing reads as lopsided.

### Native selects must replace the default arrow

Strip the native arrow (`appearance: none` + vendor prefixes); a `<select>` can't contain elements, so wrap it in a `position: relative` wrapper and absolutely position a `codicon-chevron-down` (`pointer-events: none`) inset `size60` (6px) from the inline-end edge, reserving `paddingInlineEnd` for it (6px inset + 16px glyph + 6px gap = 28px, the same formula as the input-icon inset above) — never an SVG background-image. Match sibling input states, and gate `color-scheme: dark` on the theme kind — `:root[data-vscode-theme-kind="dark"] select, :root[data-vscode-theme-kind="high-contrast"] select { color-scheme: dark; }` — so the still-OS-rendered option popup matches without forcing dark in light themes (`components/select.md`).

### Button labels must not wrap — buttons must not shrink

`white-space: nowrap` on the label; `flex-shrink: 0; min-width: fit-content` on the button. Neighbors compress or truncate first. Icon-only buttons are exempt from nowrap but still must not shrink below their touch target.

### Adjacent buttons must share the same size

Buttons in one row match height, padding, font size, and border width from one shared size token (`foundation/spacing.md`). Width may differ by label length; height/padding must not. Hierarchy comes from variant, never resizing.

### Buttons use the design system's base size — not arbitrary scales

Primary/secondary/ghost/icon buttons share one base height/padding token. Only dropdown triggers and data-entry widgets (comboboxes, filter chips) use non-base size tokens. When a button sits beside an input, size the input to the button's outer height — never shrink the button.

---

## Conflict resolution priority

1. **Accessibility** — non-negotiable, always wins (`accessibility.md`).
2. **Usability / interaction clarity** — the user must complete their task.
3. **Performance** — a card that doesn't load isn't a design.
4. **Constraints** — respect the panel, theme, and CSP sandbox.
5. **Hierarchy** — the user must understand what is important.
6. **Aesthetics / polish** — important, but never at the cost of function or access.

Every concrete value referenced above has exactly one home in `foundation/*.md`. If this file and a foundation file ever disagree on a number, the foundation file is the bug — fix it there.
