# Codicons

> the icon system: VS Code's codicon font.
> Depends on: `foundation/colors.md`, `foundation/typography.md`

Icons are codicon font glyphs via class names, never SVG sprites or an alternate icon font. Two contexts deliver the font differently — see below.

---

## Anatomy

| Part | Role |
|---|---|
| **Icon element** | `<span class="codicon codicon-<name>">` (or `<i>`) |
| **Modifier class** | Optional behavior/state class (e.g. spin) |

---

## Usage

```html
<span class="codicon codicon-chevron-down"></span>
```

| Property | Token / value |
|---|---|
| Size (standard) | 16px (see `foundation/typography.md`) |
| Size (compact) | 12px — see the specificity note below; a single-class override silently renders 16px |
| Color | `--vscode-icon-foreground` or `currentColor` when inheriting a parent's text color (e.g. inside a status badge) |

---

## Delivery by context

| Context | Delivery |
|---|---|
| Extension webview | Bundled `codicon.css`, always available — reference class names directly |
| Card HTML (sandboxed iframe) | Sanctioned CDN stylesheet (`@vscode/codicons` link in `contexts.md`) — reference class names directly. Inline SVG as a `data:` URI is the fallback only when the page must work with the CDN unavailable |

---

## Common names

`chevron-down`, `close`, `check`, `add`, `edit`, `trash`, `sync`, `loading`

---

## Variants

### Standard (16px)

Default toolbar/button/list icon size.

### Compact (12px)

Dense contexts — inline badges, small chips, secondary affordances.

`codicon.css` sets the 16px default via `.codicon[class*='codicon-']` (specificity 0-2-0), which beats any single-class override — `.icon-compact { font-size: 12px }` silently loses and the glyph stays 16px. Match it with a two-class selector in a stylesheet loaded after the codicon CSS:

```css
.codicon.icon-compact { font-size: 12px; }
```

### Spin modifier

`codicon-modifier-spin` on `codicon-loading` (or `codicon-sync`) for in-progress states — see `components/progress.md`.

---

## States

| State | Treatment |
|---|---|
| Resting | `--vscode-icon-foreground` or inherited `currentColor` |
| Disabled | Parent control's disabled treatment (opacity/foreground swap) applies to the icon too |
| Loading | Spin modifier, continuous rotation, honors `body.vscode-reduce-motion` per `foundation/motion.md` |

---

## Accessibility

- Icon-only controls need an `aria-label` on the control, not the icon span.
- Decorative icons (paired with visible text) get `aria-hidden="true"`.
- Never convey meaning by icon shape alone without a label, tooltip, or adjacent text.

---

## Prohibited

- No mixing icon fonts (Font Awesome, Material Icons, etc.) with codicons in the same UI.
- No literal hex icon color — `--vscode-icon-foreground` or `currentColor` only.
- No codicon delivery in card HTML other than the CDN stylesheet (`contexts.md`) or an inline-SVG fallback.
- No icon size outside 16px standard / 12px compact.
- No SVG sprite system introduced alongside codicons — pick one delivery path per context.
