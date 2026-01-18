# Test Code Guidelines

## Error Handling in Tests
Never write tests that expect silent error handling or assert that errors should be swallowed - tests codifying error suppression protect and perpetuate bugs. When testing expected error conditions, use an EventEmitter pattern to capture warnings, then assert on the captured warnings to verify the right conditions were detected.

## Data Flow Verification
When testing code paths that handle edge cases, ensure the test actually exercises the production code path - verify the data you pass reaches the code under test and that any assertions are on values produced by that code path.
