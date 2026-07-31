## Test Refinement

<core-principle>
## Behaviour Over Implementation

Tests should verify WHAT code accomplishes, not HOW it accomplishes it internally.

**Behaviour-focused tests:**
- Assert on outputs, return values, and observable side effects
- Remain stable when implementation details change
- Serve as executable documentation of requirements

**Implementation-coupled tests (refactor these):**
- Assert on internal method calls, private state, or intermediate values
- Break when code is refactored even if external behaviour is unchanged
- Provide false confidence (tests pass but requirements may not be met)
</core-principle>

<anti-patterns>
## Test Anti-Patterns to Refactor

1. **Excessive mocking of internals** — Tests that mock internal dependencies and assert on call sequences are coupled to implementation structure. Replace with real dependencies and assertions on observable outcomes.
2. **Asserting private state** — Tests accessing private fields (`cache['_storage']`) are tightly coupled. Assert through public interface instead.
3. **Testing implementation sequence** — Tests verifying the order of internal operations break when implementation is optimised. Assert on final state/outcomes instead.
4. **Mirror tests** — Tests that reimplement the function under test (`expected = items.reduce(...)`) provide no value. Assert against known expected values.
</anti-patterns>

<redundancy-assessment>
## Assessing Test Redundancy

Tests are redundant when they:
- Exercise the same code path with trivially different inputs
- Assert the same behaviour as another test
- Exist only because of a "test everything" mandate without judgment

**Questions to assess:**
- Do two tests always fail together for the same root cause? One may be redundant.
- Does the test document a distinct requirement or edge case from the plan? Keep it (this is also the tie-breaker when uncertain).
- Does removing the test reduce confidence in the system? Keep it. If not, consider removal or consolidation.

Regardless of consolidation, at least one test must cover each explicit plan requirement.

**Consolidation techniques:**
- Use parameterised tests (`test.each`) for multiple inputs with same logic
- Group related scenarios under `describe` blocks
</redundancy-assessment>

<simplification-techniques>
## Simplifying Test Code

- **Reduce setup complexity**: Extract common setup into factory helpers so test intent is clear
- **Follow Arrange-Act-Assert**: Structure tests with clear phases
- **Use descriptive test names**: Describe the behaviour, not the implementation — e.g., "createUser returns user with generated UUID" not "test createUser"
</simplification-techniques>

<alignment-checklist>
## Test-Code Alignment Checklist

After refactoring production code, verify test alignment:

- [ ] **Renamed elements**: If functions or classes were renamed, are test descriptions updated?
- [ ] **Split responsibilities**: If a function was split, are tests reorganised to cover each part?
- [ ] **Removed branches**: If code branches were removed, are corresponding tests removed or updated?
- [ ] **Changed signatures**: If function signatures changed, are test calls updated?
- [ ] **New edge cases**: If refactoring revealed edge cases, are tests added?
- [ ] **Obsolete assertions**: Are there assertions that no longer make sense after refactoring?
</alignment-checklist>
