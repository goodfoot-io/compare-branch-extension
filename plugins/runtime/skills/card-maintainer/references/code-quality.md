# Code Quality Evaluation

Detailed criteria for assessing implementation correctness, type safety, test quality, and code simplicity.

## Production-Ready Requirements

Implementation must meet ALL criteria:

1. **All tests pass** — No failing tests in test suite
2. **Type checking passes** — TypeScript compilation succeeds without errors or warnings
3. **Linting passes** — No linting issues
4. **Behavioral tests exist** — Critical functionality validated through TDD tests
5. **Handles edge cases** — Error conditions, boundary inputs, and failure modes have explicit code paths — not just happy-path coverage. Verify by checking that functions receiving external input validate or guard against invalid, empty, and out-of-range values.
6. **Public APIs documented** — Exported functions and modules have documentation that explains usage and contracts. Internal code should be self-explanatory; comments restating what code already says ("Gets the user" above `getUser()`) do not satisfy this requirement.
7. **Tests exit cleanly** — Tests complete and process exits properly (no open handles)
8. **No resource leaks** — All async operations, timers, and connections properly closed

## Type-Driven Practice Evaluation

**Type Contract Clarity**: Are type contracts between modules clear and enforced by the compiler, or do they rely on convention and documentation?

**Native Type Usage (>80% target)**: Measure the ratio of native/built-in types to custom types. The >80% target is a quality signal, not a blocking gate. Flag low native type usage as a recommended improvement — unless the implementation uses `any` types in public API contracts, which is a blocking type safety issue.

**Type Safety Assessment**: Monitor for:
- `any` types in public contracts (blocking)
- Excessive custom types when native equivalents exist
- Missing type exports
- Weak type contracts
- Untyped test utilities

## Test Quality Philosophy

Tests are valued for behavioral validation, not line coverage. Missing tests are only a concern if behavior is unvalidated.

**Quality indicators:**
- Tests fail when behavior breaks
- Tests document intended behavior
- Tests validate edge cases and error paths

**Anti-patterns to flag:**
- Tests that only exercise code without assertions
- Tests added solely to cover getters/setters
- Redundant tests that validate the same behavior

## Code Simplicity Philosophy

Evaluate simplicity by asking whether the code earns its complexity — not by matching specific patterns.

### Connectivity

Does every write have a reader and every read have a writer within the local scope? A parameter that no caller supplies is dead. A return value that every call site discards is dead. A property assigned in a constructor but never accessed is dead. An optional field whose absence no consumer handles gracefully is not optional — it is an incomplete producer. Verify that each value flows from a source to a destination; code that adds capability without connectivity is worse than no code at all.

### Error Propagation

Does each catch block handle a specific, named error condition — or does it discard all errors by default? Catches that return a success value on any exception hide failures from callers. Every suppression must be justified by the specific error being handled.

### Control Flow Legibility

Can a reader trace the primary execution path without reconstructing state in their head? Stateful flags, deep nesting, and assignments deferred until multiple conditions are evaluated obscure intent. Guard clauses and direct returns expose it.

### Extraction Value

Does a named function or variable give meaning to an otherwise unnamed concept, or enable genuine reuse? Extraction that only moves code without improving readability at the call site adds indirection without benefit.

### Severity Levels

- **HIGH**: Silent error suppression — empty catch, or catch-all that returns a success value on any exception
- **MEDIUM**: Control flow that requires state reconstruction — flags, deep nesting, or deferred assignment logic
- **LOW**: Data-flow disconnection — dead stores (value assigned but never read), unused parameters (declared but not consumed in the body or supplied by callers), return values systematically discarded at call sites, optional fields that consumers always assert or narrow before use
