# Tables

> structured, comparative, multi-column data.
> Depends on: `foundation/colors.md`, `foundation/spacing.md`, `foundation/typography.md`

A data table for genuinely comparative rows — use `list-rows.md` for single-column lists/trees instead. Rows share the workbench 22px baseline; separation comes from optional zebra striping or a hairline column rule, never a shadow.

---

## Anatomy

| Part | Role |
|---|---|
| **Header** | Column labels, one row |
| **Body row** | Data row, 22px baseline |
| **Cell** | Data or header cell |
| **Column border** | Optional vertical rule between columns |

---

## Layout

| Property | Token / value |
|---|---|
| Row height / line-height | 22px (text-only rows) |
| Cell padding | `--vscode-spacing-size80` horizontal; 0 vertical in text-only rows — every cell in a row containing a badge/chip/control adds `size20` (2px) vertical padding and the row grows to fit (~26px) |
| Column border | 1px, `--vscode-tree-tableColumnsBorder` |
| Numeric column alignment | right-aligned; label/text columns left-aligned |

## Typography

| Element | Token |
|---|---|
| Header label | body2 (11px) or label2, uppercase, `--vscode-descriptionForeground`, or `--vscode-panelSectionHeader-foreground` on a section-header-styled table |
| Body cell | body1 (13px), regular |
| Numeric cell | body1 (13px), tabular figures where the font supports it |

## Color & surface

| Part | Token |
|---|---|
| Header background | `--vscode-panelSectionHeader-background` (or transparent with just the caps treatment) |
| Header border | `--vscode-panelSectionHeader-border` bottom rule |
| Body row (default) | transparent |
| Body row, odd/even striping | `--vscode-tree-tableOddRowsBackground` on odd rows |
| Row hover | `--vscode-list-hoverBackground` / `--vscode-list-hoverForeground` |
| Row selected | `--vscode-list-activeSelectionBackground` / `--vscode-list-activeSelectionForeground` (focused) vs. inactive equivalents (blurred) — see `list-rows.md` |

---

## Variants

### Striped

Odd rows `--vscode-tree-tableOddRowsBackground`; even rows transparent. Do not add column borders on top — pick striping or column rules, not both, to keep the surface flat and legible.

### Column-ruled

No striping; 1px `--vscode-tree-tableColumnsBorder` between columns. Use when columns represent distinct data types (e.g. a diff/comparison table) rather than repeated records.

### Sortable header

Header label + a 16px sort codicon (`codicon-arrow-up`/`-down`); active sort column's header uses `--vscode-foreground` instead of the dimmer description color.

---

## States

| State | Treatment |
|---|---|
| Row hover | `--vscode-list-hoverBackground` |
| Row selected | active/inactive selection tokens per `list-rows.md` |
| Sort active | header foreground brightens to `--vscode-foreground` |
| High contrast | column borders and row separators always render (they're already literal 1px borders, not decorative); selected row adds `border: 1px solid var(--vscode-contrastActiveBorder, transparent)` |

---

## Accessibility

- Native `<table>`/`<thead>`/`<tbody>`/`<th scope="col">`.
- `aria-sort="ascending|descending|none"` on sortable headers.
- Row selection: `aria-selected` on `<tr>` or wrapping `role="row"` element; multi-select announces count via a live region if driven by JS.
- Never use a table for single-column or hierarchical (tree) content — that's `list-rows.md`.

---

## Prohibited

- No row height other than the 22px baseline for text-only rows; badge/control rows grow only via the `size20` cell-padding rule above.
- No fixed `height` on cells that hold badges/controls — the flush look of a 20px badge in a 22px row is a defect.
- No striping combined with column borders — pick one readability cue.
- No shadow on the table or its header (flat, per `foundation/shadows.md`).
- No font size below body2 (11px) in cells.
- No hardcoded striping color — always `--vscode-tree-tableOddRowsBackground`.
