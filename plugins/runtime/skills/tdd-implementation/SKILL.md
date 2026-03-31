---
name: tdd-implementation
description: Test-driven development workflow for implementing new functionality.
---

<instructions>

## 1. Types and Stubs

Create type definitions and function/method stubs first:
- Define all input/output types
- Export functions/methods with correct signatures
- Stub bodies throw a "not implemented" error
- This establishes the API contract before implementation

## 2. Write Skipped Tests

Write tests marked to skip:
- Cover expected behavior, error cases, and edge cases
- Tests document the expected contract

## 3. Implement and Unskip

1. Implement the function
2. Remove the skip marker from related tests
3. Run tests to verify
4. Fix any failures
5. Repeat for remaining skipped tests

## Summary

| Step | Action | Test State |
|------|--------|------------|
| 1. Types & Stubs | Define types, create throwing stubs | No tests yet |
| 2. Write Tests | Write comprehensive tests | Skipped |
| 3. Implement | Fill in implementation | Unskipped |

</instructions>
