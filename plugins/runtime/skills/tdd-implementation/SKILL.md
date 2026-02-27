---
name: tdd-implementation
description: Test-driven development workflow for implementing new functionality.
---

# TDD Implementation Workflow

Follow this workflow when implementing new functionality.

## Phase 1: Types and Stubs

Create type definitions and function/method stubs first:
- Define all input/output types
- Export functions/methods with correct signatures
- Throw `Error('Not Implemented')` in function bodies
- This establishes the API contract before implementation

## Phase 2: Write Skipped Tests

Write tests using `it.skip` for the functionality:
- Use `it.skip` for all new tests (they would fail against stubs)
- Cover the expected behavior thoroughly
- Include error cases and edge cases
- Tests document the expected contract

## Phase 3: Implement and Unskip

Implement the function, then unskip and run tests:
1. Implement the function
2. Change `it.skip` to `it` for related tests
3. Run tests to verify
4. Fix any failures
5. Repeat for remaining skipped tests

## Summary

| Phase | Action | Test State |
|-------|--------|------------|
| 1. Types & Stubs | Define types, create throwing stubs | No tests yet |
| 2. Write Tests | Write comprehensive tests | `it.skip` |
| 3. Implement | Fill in implementation | `it` (unskipped) |
