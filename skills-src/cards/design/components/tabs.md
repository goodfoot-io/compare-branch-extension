# Tabs

> switching between sibling views within a webview page.
> Depends on: `foundation/colors.md`, `foundation/spacing.md`, `foundation/typography.md`, `foundation/motion.md`

Two flavors: an **editor-tab-style strip** (filled active tab, like VS Code's own editor tabs) and a **panel-underline strip** (label + active bottom rule, like the Output/Terminal panel switcher). Both are flat — no shadow, no shifting layout on activate.

---

## Anatomy

| Part | Role |
|---|---|
| **Tab list** | Row of tab triggers |
| **Tab** | Selectable label (button, `role="tab"`) |
| **Indicator** | Fill (strip) or bottom rule (underline) marking active tab |
| **Panel** | Content region tied to the active tab |

---

## Layout

| Property | Token / value |
|---|---|
| Tab padding | `--vscode-spacing-size80` horizontal, `size40` vertical |
| Gap between tabs | 0 (strip variant, tabs are flush); `--vscode-spacing-size120` (underline variant) |
| List bottom border | 1px, `--vscode-tab-border` (strip) or `--vscode-panel-border` (underline) |
| Underline thickness | 2px, `--vscode-panelTitle-activeBorder` |

## Typography

| Element | Token |
|---|---|
| Tab label | body1 (13px), regular; semiBold (600) on active |

---

## Variants

### Strip (editor-tab style)

| State | Background | Foreground |
|---|---|---|
| Active | `--vscode-tab-activeBackground` | `--vscode-tab-activeForeground` |
| Inactive | `--vscode-tab-inactiveBackground` | `--vscode-tab-inactiveForeground` |
| Border | `--vscode-tab-border` between tabs and under the strip | |

### Underline (panel-title style)

| State | Text | Bottom border |
|---|---|---|
| Active | `--vscode-panelTitle-activeForeground` | 2px `--vscode-panelTitle-activeBorder` |
| Inactive | `--vscode-panelTitle-inactiveForeground` | transparent |
| List bottom rule | `--vscode-panelSectionHeader-border` or `--vscode-panel-border` | |

Use underline for a page's top-level section switcher (fewer, heavier tabs); use strip when tabs represent open/closeable documents.

---

## States

| State | Treatment |
|---|---|
| Hover (inactive tab) | Strip: `var(--vscode-tab-hoverBackground, var(--vscode-toolbar-hoverBackground))` + `--vscode-tab-hoverForeground` (fallback required — default themes leave `tab.hoverBackground` undefined). Underline: foreground swaps to `--vscode-panelTitle-activeForeground`, no background. No shadow either way |
| Keyboard focus | `outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px` |
| Disabled | `--vscode-disabledForeground`, not focusable |
| High contrast | hover background suppressed; active tab gets `border: 1px solid var(--vscode-contrastActiveBorder, transparent)`; every tab keeps `border: 1px solid var(--vscode-tab-border, transparent)` for edge visibility |

---

## Accessibility

- Tab list: `role="tablist"`; tab: `role="tab"` + `aria-selected`; panel: `role="tabpanel"` + `aria-labelledby`.
- Roving tabindex: active tab `tabindex="0"`, rest `-1"`; Left/Right (or Up/Down) arrow keys move focus and, per platform convention, activate on arrow (automatic activation) unless the tab body is expensive to render (manual activation + Enter/Space).
- Home/End jump to first/last tab.
- Disabled tabs excluded from arrow-key traversal.

---

## Prohibited

- No mixing strip and underline styling in one tab list.
- No shadow or elevation on tabs or the panel — flat, per `foundation/shadows.md`.
- No layout shift (width jump) when a tab becomes active.
- No tab activation without updating both `aria-selected` and the visible indicator.
