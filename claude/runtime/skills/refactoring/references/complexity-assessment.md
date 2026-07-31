## Complexity Assessment Framework

<core-distinction>
## Essential vs. Accidental Complexity

**Essential complexity** originates from the problem domain. It cannot be removed without losing functionality or violating requirements. Examples: regulatory financial calculations, distributed consistency handling, security authentication flows, domain logic mirroring real-world processes.

**Accidental complexity** originates from the solution. It can be removed or simplified without affecting requirements. Examples: over-engineered architecture, design patterns without demonstrated need, single-implementation abstractions, configurable options that never vary, "future-proof" extension points with no consumers.
</core-distinction>

<assessment>
## Decide Per Complex Element

Ask, in order:

1. **Does the plan require this sophistication** — including an explicit edge case it handles? If the plan does not mention the need, the complexity is likely accidental.
2. **Would simpler code pass the same tests?** If yes, replace with the simpler version.
3. **Is there a well-known simpler solution?** Verify no standard library, well-known algorithm, or common pattern solves the problem more directly before preserving.

Known accidental patterns and their fixes:

- Abstraction serving a single implementation → inline it
- Configuration options that never vary → remove; use constants
- Pattern preparing for unplanned future needs → remove; rebuild when the need arrives

**Preserve** only when the plan justifies the complexity, tests specifically exercise it, and a straightforward approach would fail requirements — with the choice explained in the implementation log or comments. If any criterion is unmet, investigate simplification.
</assessment>
