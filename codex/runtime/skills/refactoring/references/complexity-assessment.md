## Complexity Assessment Framework

<purpose>
This document provides a systematic approach to distinguishing essential complexity from accidental complexity. Use this framework when you encounter sophisticated code and must determine whether to simplify or preserve it.
</purpose>

<core-distinction>
## Essential vs. Accidental Complexity

**Essential complexity** originates from the problem domain. It cannot be removed without losing functionality or violating requirements. Examples: regulatory financial calculations, distributed consistency handling, security authentication flows, domain logic mirroring real-world processes.

**Accidental complexity** originates from the solution. It was introduced during implementation and can be removed or simplified without affecting requirements. Examples: over-engineered architecture, design patterns without demonstrated need, single-implementation abstractions, configurable options that never vary, "future-proof" extension points with no consumers.
</core-distinction>

<assessment-questions>
## Questions to Determine Complexity Type

Apply these questions systematically when evaluating complex code:

1. **Does the plan require this sophistication?** If the plan does not mention the need for this level of abstraction, configuration, or generality, the complexity is likely accidental.
2. **Would simpler code pass the same tests?** If a straightforward implementation would satisfy all test cases, the additional sophistication is not earning its place.
3. **Does the complexity map to domain requirements?** Essential complexity has a direct correspondence to requirements. Each complex element should trace to a specific need.
4. **Is there a well-known solution that is simpler?** Before preserving complex code, verify that no standard library, well-known algorithm, or common pattern solves the problem more directly.
</assessment-questions>

<decision-matrix>
## Decision Matrix

Based on the observed condition:
- **Plan explicitly requires this behaviour**: Essential complexity — Preserve, ensure documentation
- **Plan does not mention this sophistication**: Likely accidental complexity — Simplify if tests still pass
- **Tests would pass with simpler code**: Accidental complexity — Replace with simpler version
- **Complexity handles explicit edge cases from plan**: Essential complexity — Preserve
- **Abstraction serves single implementation**: Accidental complexity — Inline the abstraction
- **Configuration options never vary**: Accidental complexity — Remove configuration, use constants
- **Pattern prepares for unplanned future needs**: Accidental complexity — Remove, rebuild when needed
</decision-matrix>

<preservation-criteria>
## When to Preserve Complexity

Preserve complexity when ALL of the following apply:

1. **Plan justification exists** - The plan document mentions the requirement this complexity addresses
2. **Tests exercise the complexity** - Test cases specifically validate the sophisticated behaviour
3. **Simpler alternatives fail requirements** - A straightforward approach would not satisfy the plan
4. **Domain experts confirm necessity** - The implementation log or comments explain why this approach was chosen

If any criterion is not met, investigate whether simplification is possible.
</preservation-criteria>
