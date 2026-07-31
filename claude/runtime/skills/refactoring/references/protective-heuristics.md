## Protective Heuristics

Keeping unclear code costs maintenance; deleting necessary code costs production failures. That asymmetry makes conservatism the default.

<core-philosophy>
## The "Ask Why" Philosophy

Before labelling unfamiliar code as unnecessary, reconstruct the author's reasoning:

- **What problem were they facing?**
- **What constraints might have led to this approach?**
- **Is there a subtle requirement this addresses?**

Only after understanding intent should you determine whether code is truly unnecessary.
</core-philosophy>

<pause-signals>
## Red Flags: When to Pause Before Removing

Stop and investigate further if ANY of the following apply:

1. **You do not fully understand the code** — if you cannot explain what it does and why it might be needed, do not remove it
2. **The plan mentions related behaviour** — if the plan document references the behaviour this code might support, preserve it
3. **The implementation log references it** — if the log explains why this code exists, respect that context
4. **Tests depend on this behaviour** — if tests exercise this code path, the behaviour is expected somewhere
5. **The code handles edge cases** — code that appears redundant may handle edge cases not obvious from the happy path (e.g., `NaN`/`Infinity` checks, null handling, race conditions)
</pause-signals>

<cross-reference-checklist>
## Cross-Reference Checklist Before Removal

Before removing any code, verify against these sources:

### Plan Document
- [ ] **Plan goals**: Is this behaviour mentioned as a requirement?
- [ ] **Plan approach**: Is this part of the specified implementation?
- [ ] **Constraints**: Does this address a stated constraint or limitation?
- [ ] **Non-Goals**: Is this explicitly out of scope (if so, removal may be appropriate)?

### Implementation Log
- [ ] **Decision Records**: Does the log explain why this approach was chosen?
- [ ] **Workarounds**: Is this documented as a workaround for a known issue?
- [ ] **Experiments**: Is this a remnant of an abandoned approach (if so, removal may be appropriate)?

### Test Coverage
- [ ] **Direct Tests**: Are there tests that specifically exercise this code?
- [ ] **Indirect Coverage**: Do integration tests rely on this behaviour?
- [ ] **Edge Case Tests**: Do tests cover scenarios this code might handle?

### Codebase Patterns
- [ ] **Similar Code**: Is similar code used elsewhere in the codebase?
- [ ] **Defensive Patterns**: Is this a project-wide defensive coding pattern?
</cross-reference-checklist>

<safe-removal-criteria>
## Safe Removal Criteria

Code is safe to remove when ALL of the following apply:

1. **Plan confirmation**: The plan document does not require this behaviour
2. **No test coverage**: No tests exercise or depend on this code path
3. **Log does not justify**: The implementation log does not explain its purpose
4. **Full understanding**: You understand what the code does and can articulate why it is not needed
5. **No downstream dependencies**: Removing this code does not break other parts of the system
</safe-removal-criteria>

<summary>
## Summary Decision Tree

Based on whether the code's purpose is clear:

- **Purpose is NOT clear**: Investigate further (search references, review git history, trace call paths, check error handling)
  - **Still unclear after investigation**: Do NOT remove, flag for review with a TODO comment
- **Purpose is clear**: Apply safe removal criteria
  - **All criteria met**: Safe to remove
  - **Any criterion not met**: Do NOT remove
</summary>
