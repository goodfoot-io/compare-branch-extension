# End-to-End Evaluation

Detailed dimensions for verifying that an implementation is fully connected — from entry points through to side effects, from producers to consumers.

## Scope Rules

**Baseline**: "New" means changed since the implementation baseline. Use `git diff` against the baseline tag provided in the workspace to identify added, modified, or deleted symbols.

**Trace depth**: Trace within plan-modified files and their direct importers. Do not chase transitive consumers beyond one hop — if a direct consumer is misaligned, that is the finding. The transitive impact is a concern for the next review cycle.

**N/A dimensions**: When a dimension does not apply (e.g., no events exist, no config keys are used, no barrel files in scope), mark it PASS with a brief note explaining why it is not applicable. Do not invent findings to fill an empty dimension.

**Intent vs. plan conflicts**: Commander's intent takes precedence — it describes the "why." The plan describes the "how." If the plan contradicts the intent, that is itself a required change.

## Evaluation Dimensions

Work through each dimension systematically. Each is an equal evaluation point.

### Reachability

Is every new symbol reachable from a real execution path?

- Is every new function, class, or constant reachable via imports from an entry point (route, command, lifecycle hook, event subscription)?
- Are there new files that nothing imports?
- Are there barrel re-exports that no consumer ever imports?
- Are there code branches within new functions that can never be reached given calling conditions?

### Data Flow

Every write has a reader. Every read has a writer.

- Is every property written to an object also read by consuming code?
- Is every value stored to a cache, queue, or intermediate structure also retrieved and acted upon?
- Is every function parameter actually used within the body — or is it orphaned with no caller passing a meaningful value?
- Is every return value consumed at call sites — or silently discarded?
- Is every config key or environment variable that is read also set by some code path?
- When multiple code paths produce the same type for the same consumer (e.g., initial fetch vs real-time event, cache hit vs miss), do they provide equivalent fields?

### Consumer Alignment

When interfaces change, all consumers must update.

- Have all call sites been updated when a function signature changed?
- Have all producers and consumers of a modified data structure been updated to match the new shape?
- Are there semantic mismatches where both sides use the same field name but mean different things (e.g., timestamps in different zones, amounts in different units)?
- If a new field was added to a shared type, have serializers, deserializers, and constructors been updated?
- Do all pre-existing callers of modified functions still receive results consistent with their original contract?

### Error Propagation

Errors at boundaries must surface, not disappear.

- Does every operation that can fail (I/O, network, parsing) have explicit error handling?
- Are caught errors specific to expected failure types — or does a broad `catch` swallow unexpected failures silently?
- When a dependency is unavailable, does the system fail closed (error returned) rather than proceeding with missing data?
- Does every new error type have at least one caller that handles or propagates it?
- Are there fallback values from catch blocks that suppress meaningful failures and allow corrupted state to propagate?

### Registration and Wiring

Is the feature plugged into the runtime?

- Is every new route, handler, middleware, or plugin registered — either explicitly in a manifest/bootstrap or implicitly via the codebase's registration mechanism (decorators, convention-based directories, auto-scanning)? Verify the actual mechanism, not just grep for manifest entries.
- Is every new event emitter paired with at least one listener, and every listener registered for a corresponding event?
- Are new symbols exported from their module and re-exported from barrel files where consumers expect them?
- If a new capability was added on one side of an interface (e.g., new API endpoint), is the corresponding consumer also implemented and wired?

### Requirement Coverage

Does every acceptance criterion trace to code?

- Does the implementation cover every explicit acceptance criterion — not just the primary happy path?
- Are all sub-requirements and edge cases described in the card addressed, not just the main scenario?
- Are there TODO comments or stub implementations that were meant to be filled in? Distinguish intentional future-work markers (e.g., "TODO: optimize in follow-up card") from stubs the plan intended to complete (e.g., `throw new Error('not implemented')` in a function the plan lists).
- Are all stated constraints (input limits, required fields, format restrictions) enforced in code?

### Test Fidelity

Do tests verify real integration, not just isolated pieces?

- Is there at least one test that exercises the path from the registered entry point through to the implementation — not only unit tests of internals?
- Do mocks and stubs match the actual contracts of the real implementations they replace?
- Are the conditions under which the feature activates (flags, config, environment) also tested — not just the behavior once active?
- Were any existing tests deleted or disabled? If so, is the behavior they covered now covered elsewhere?

## Classification Framework

Classify each finding as **required** or **recommended** using the first matching signal:

- **Broken wiring**: Required — a code path from entry point to side effect is incomplete (function exists but no caller, export not re-exported, event registered but never emitted)
- **Consumer misalignment**: Required — a consumer still references the old interface, uses stale types, or doesn't know about the new capability
- **Explicit acceptance criterion not met**: Required — the card or plan states this as a condition for completion and the implementation does not satisfy it
- **Workspace standard violation**: Required — the implementation violates CLAUDE.md conventions (e.g., silent error swallowing, missing error propagation)
- **Improves without contradicting**: Recommended — the finding would make the implementation better but does not prevent the feature from working
