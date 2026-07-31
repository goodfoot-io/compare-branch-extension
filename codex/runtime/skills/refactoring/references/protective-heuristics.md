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

<removal-criteria>
## Removal Criteria

Remove code only when ALL of the following hold:

1. **Full understanding** — you can explain what the code does and articulate why it is not needed. Beware code that appears redundant but handles non-obvious edge cases (`NaN`/`Infinity` checks, null handling, race conditions).
2. **Plan confirmation** — the plan document does not require or reference this behaviour
3. **Log does not justify** — the implementation log does not explain its purpose
4. **No test coverage** — no tests exercise or depend on this code path
5. **No downstream dependencies** — removal does not break other parts of the system

If any criterion fails, do NOT remove. When the purpose is unclear, investigate first (search references, review git history, trace call paths, check error handling); if still unclear after investigation, leave the code in place and flag it for review with a TODO comment.
</removal-criteria>

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
