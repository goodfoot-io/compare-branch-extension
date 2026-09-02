# Select

> lets a user choose one value from a closed list.
> Depends on: `foundation/colors.md`, `foundation/radius.md`, `foundation/spacing.md`, `foundation/typography.md`, `components/menus.md`

A select is a bordered trigger control, theme-colored exactly like a text input, that opens a popup list. The trigger uses input-family tokens; the popup list defers to `components/menus.md`.

---

## Anatomy

| Part | Role |
|---|---|
| **Trigger** | Closed-state control showing the current value + chevron |
| **Popup listbox** | Opened option list — see `components/menus.md` for its styling |
| **Option** | One selectable row inside the popup |

## Layout & sizes

| Property | Value |
|---|---|
| Height | 26px, set explicitly (`height: 26px`; content centers vertically) |
| Padding | `0 6px` horizontal only |
| Radius | `--vscode-cornerRadius-small` (4px, `radius.md`) |
| Font | inherited 13px body (`typography.md`) |

## Color & surface — trigger

| Property | Token |
|---|---|
| Background | `--vscode-dropdown-background` |
| Text | `--vscode-dropdown-foreground` |
| Border | `1px solid var(--vscode-dropdown-border, transparent)` |

## Color & surface — popup list

| Property | Token |
|---|---|
| List background | `--vscode-dropdown-listBackground` |
| Structure (radius, shadow, item rows, selection state, keyboard nav) | See `components/menus.md` |

## Variants

### Native `<select>`
Browser-rendered popup; style only the trigger with the tokens above — the native popup cannot be restyled inside a sandboxed iframe.

### Custom dropdown
A trigger `<button>`-like element plus a JS-driven popup built to the `menus.md` spec — use when option content needs more than plain text (icons, descriptions, status swatches).

### `<vscode-single-select>`
Where the CDN element bundle is loaded (`contexts.md`), prefer the vscode-elements select over a hand-rolled custom dropdown:
```html
<vscode-single-select>
  <vscode-option value="todo">To Do</vscode-option>
  <vscode-option value="active" selected>Active</vscode-option>
</vscode-single-select>
```
Shadow-DOM element — theme via `--vscode-dropdown-*` vars set on the host.

## States

| State | Treatment |
|---|---|
| Default | `-dropdown-background/-border` |
| Hover (trigger) | No fill change — border only, matches input behavior |
| Open | Popup shown per `menus.md`; trigger border may switch to `--vscode-focusBorder` |
| Focus | `outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px` |
| Disabled | `opacity: 0.4`, `pointer-events: none` |
| High contrast | Trigger border always visible; open state marked with `--vscode-contrastActiveBorder` |

## Accessibility

- Native `<select>` gets accessibility for free; label it with `<label for>`.
- Custom dropdowns use the **combobox pattern**: `role="combobox"` on the trigger with `aria-expanded`, `role="listbox"`/`role="option"` on the popup, `aria-controls` naming it while open, focus staying on the trigger with `aria-activedescendant` tracking the active option. (menus.md's focus-trap model is for context menus, not select popups.) A `div`/`button` trigger is not labelable by `<label for>` — name it with `aria-labelledby` pointing at the visible label element.
- `<vscode-single-select>`: shadow DOM blocks `label[for]` and host `aria-label` doesn't reach the internal combobox — use the element's `label` attribute, always, plus an adjacent visible label.
- Selected option is announced on change.

## Prohibited

- No literal hex colors — `--vscode-dropdown-*` only.
- No radius other than `radius.small` (4px) on the trigger.
- No restyling of the native `<select>` popup — style the trigger only.
- No popup styling duplicated here — defer entirely to `menus.md`.
