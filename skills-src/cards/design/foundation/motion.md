# Motion Tokens

> VS Code UI is nearly motionless — keep it short. Hover is a flat background swap, transitions are short utility fades, and any component reaching for more transform/timing than this is out of scope for this system.

Depends on: none (honors `body.vscode-reduce-motion`, set by the host).

---

## Token naming

| Pattern | Rule |
|---|---|
| `motion-duration-<step>` | Named duration step |
| `motion-reduce` | Gate — honor `body.vscode-reduce-motion` |

---

## Motion scale

| Token | Value | Used by |
|---|---|---|
| motion-duration-instant | 0ms | State changes under reduced motion |
| motion-duration-fast | 80–100ms | Background-color hover/active swaps |
| motion-duration-base | 120–150ms | Menu/tooltip/dialog fade-in |

No token exceeds ~150ms — if a design calls for anything slower, it does not belong in this system.

---

## Flat registry

```
motion-duration-instant   0ms
motion-duration-fast      80-100ms
motion-duration-base      120-150ms
gate                      body.vscode-reduce-motion
```

---

## Hover rule (mandatory)

Hover feedback is a **background-color swap only**. Never animate `transform`, `box-shadow`, `scale`, or size on hover — VS Code controls do not lift, scale, or grow. Example: button hover transitions `background-color` from `--vscode-button-background` to `--vscode-button-hoverBackground` over `motion-duration-fast`, nothing else.

## Reduced motion

Honor `body.vscode-reduce-motion`: when present, collapse all transition durations to `motion-duration-instant`. Apply this globally with one rule scoped to `body.vscode-reduce-motion *` rather than gating per component.

## Usage by surface type

| Surface | Motion |
|---|---|
| Button/input/list-row hover | background-color swap, motion-duration-fast |
| Menu/tooltip/dialog appearance | opacity fade, motion-duration-base |
| Progress bar (indeterminate) | continuous, see `components/progress.md` |
| Everything else at rest | no transition |

## Prohibited

- No `transform` (scale/translate/rotate) on hover or focus.
- No shadow added on hover — resting flat, hovered flat (background only).
- No animation duration above ~150ms.
- No motion that ignores `body.vscode-reduce-motion`.
- No bounce/spring/elastic easing — linear or a short ease-out only.
