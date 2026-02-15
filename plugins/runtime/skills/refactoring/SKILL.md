---
name: refactoring
description: This skill should be used when the user asks to "refactor code", "simplify this code", "assess code complexity", "consolidate duplicated code", "refine tests", "clean up tests", or when evaluating whether to remove unclear code, reduce accidental complexity, or judge duplication during refactoring.
---

## Available Refactoring Methodologies

Based on the refactoring scenario, load the relevant reference document:

- **Code seems over-engineered, implementation appears sophisticated for the problem scope, or abstractions exist without clear justification**: Read `references/complexity-assessment.md` for determining whether complexity is essential or accidental

- **Similar code exists in multiple locations, uncertain whether abstraction would help or harm, or weighing maintenance burden against readability**: Read `references/duplication-judgment.md` for deciding whether to consolidate or tolerate duplicated code

- **Tests appear coupled to implementation details, test suite has redundant or overlapping coverage, or uncertain whether to consolidate or separate test cases**: Read `references/test-refinement.md` for improving test code clarity and maintainability

- **Code purpose is not immediately clear, no obvious tests or plan references exist, or uncertain whether removal would break subtle requirements**: Read `references/protective-heuristics.md` for safeguards before removing code you do not fully understand
