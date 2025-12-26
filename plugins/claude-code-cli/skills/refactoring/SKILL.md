---
name: refactoring
description: Decision routing for complex refactoring scenarios. Directs to supplementary methodology documents when nuanced judgment is needed during plan-aware code cleanup.
---

<instructions>

## Available Refactoring Methodologies

Based on the refactoring scenario, load the relevant methodology document:

- **Code seems over-engineered, implementation appears sophisticated for the problem scope, or abstractions exist without clear justification**: Read `methodology/complexity-assessment.md` for determining whether complexity is essential or accidental

- **Similar code exists in multiple locations, uncertain whether abstraction would help or harm, or weighing maintenance burden against readability**: Read `methodology/duplication-judgment.md` for deciding whether to consolidate or tolerate duplicated code

- **Tests appear coupled to implementation details, test suite has redundant or overlapping coverage, or uncertain whether to consolidate or separate test cases**: Read `methodology/test-refinement.md` for improving test code clarity and maintainability

- **Code purpose is not immediately clear, no obvious tests or plan references exist, or uncertain whether removal would break subtle requirements**: Read `methodology/protective-heuristics.md` for safeguards before removing code you do not fully understand

</instructions>
