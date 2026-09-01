# Panels

> containers, section headers, and card-like surfaces.
> Depends on: `foundation/colors.md`, `foundation/spacing.md`, `foundation/radius.md`, `foundation/shadows.md`

VS Code chrome is flat and hairline-separated: surfaces stack by background-color step and a 1px border, never by shadow. Pick the right background for the surface's role in the hierarchy — page, grouped container, or elevated widget — rather than reaching for arbitrary greys.

---

## Anatomy

| Part | Role |
|---|---|
| **Page surface** | The webview's root background |
| **Container** | A grouped surface within the page (card, section) |
| **Section header** | Label row atop a container |
| **Elevated widget** | A surface that floats above page content (hover card, inline widget) |

---

## Layout

| Property | Token / value |
|---|---|
| Container padding | `--vscode-spacing-size120` (12px), per Cards convention |
| Section header padding | `--vscode-spacing-size80` horizontal, `size40` vertical |
| Border width | `--vscode-strokeThickness` (1px) |
| Radius | none on flush chrome containers; `cornerRadius.medium` (6px) on discrete "card" surfaces that sit inset from the page edge |

## Color & surface

| Role | Background | Border |
|---|---|---|
| Page surface | `--vscode-editor-background` | none |
| Grouped/sidebar-style surface | `--vscode-sideBar-background` | `--vscode-sideBar-border` |
| Panel-style surface (bottom-panel look) | `--vscode-panel-background` | `--vscode-panel-border` |
| Elevated widget (hover, inline popover-like container that isn't a true popover) | `--vscode-editorWidget-background` | `--vscode-editorWidget-border` |
| Section header, panel context | `--vscode-panelSectionHeader-background` / `-foreground` | `--vscode-panelSectionHeader-border` bottom rule |
| Section header, sidebar context | `--vscode-sideBarSectionHeader-background` / `-foreground` | `--vscode-sideBarSectionHeader-border` bottom rule |

All borders follow the HC pattern: `border: 1px solid var(--vscode-<x>-border, transparent)` — present in markup even when invisible on light/dark.

---

## Variants

### Card (Cards status surface)

A container whose accent comes from a status color at 10% opacity (see `foundation/colors.md`) rather than a visible border — used for status-tinted summaries, not as a general container background. It still declares `border: 1px solid var(--vscode-contrastBorder, transparent)` so the edge materializes in HC like every other surface.

### Section header

A label row (often ALL CAPS, `descriptionForeground` or `panelSectionHeader-foreground`) atop a container, bottom-bordered, sticky at `z-sticky` (see `foundation/layers.md`) if the container scrolls.

### Nested containers

A container inside a container drops one step in background prominence (e.g. `sideBar-background` page → `editorWidget-background` nested card) so nesting reads without adding borders on every level.

---

## States

| State | Treatment |
|---|---|
| Resting | flat background + border per table above, no shadow |
| Hover (interactive container, e.g. clickable card) | `--vscode-list-hoverBackground` overlay or foreground brighten — never a shadow lift |
| High contrast | all borders render (theme supplies real border colors); do not rely on background-color distinction alone between adjacent surfaces |

---

## Accessibility

- Section headers that toggle content use a real `<button>` with `aria-expanded`, not a styled `<div>`.
- Containers that are purely visual grouping need no ARIA role; containers that are landmarks (`region`) get `aria-label`.
- Don't communicate hierarchy by color alone in HC — the border pattern carries the structure there.

---

## Prohibited

- No decorative shadow on any container — flat by default, per `foundation/shadows.md`.
- No literal grey/hex background — always a named `--vscode-*` surface variable.
- No border-less surface where HC needs edge definition — always the `var(--x-border, transparent)` fallback.
- No radius above `cornerRadius.medium` on a panel/container (reserve `xLarge` for dialogs — see `dialogs.md`).
