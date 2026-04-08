## Duplication Judgment

<purpose>
This document provides guidance for deciding whether to consolidate duplicated code or tolerate it. Use this framework when you encounter similar code in multiple locations and must determine the appropriate action.
</purpose>

<core-principle>
## The DRY Principle and Its Limits

The goal is not to eliminate all textual similarity but to ensure that **knowledge is expressed in a single, authoritative location**.

- **Harmful duplication**: The same business logic or algorithm copied to multiple places, requiring parallel updates when requirements change
- **Acceptable similarity**: Code that looks similar but represents genuinely different concepts or serves different purposes
</core-principle>

<consolidation-criteria>
## When to Consolidate Duplication

Consolidate duplicated code when ALL of the following apply:

1. **The duplicates must change together** — a requirement change would necessitate updating all copies identically
2. **The abstraction is clear and well-named** — the consolidated code has an obvious, descriptive name communicating its purpose
3. **The abstraction does not couple unrelated code** — consolidation should not create dependencies between modules that should remain independent
4. **Maintenance burden is significant** — consider the number of copies and frequency of changes. Two copies of stable code may be acceptable; five copies of frequently-changing code should be consolidated.
</consolidation-criteria>

<tolerance-criteria>
## When to Tolerate Duplication

Tolerate duplicated code when ANY of the following apply:

1. **The duplicates serve different purposes** — code that looks similar but implements genuinely different business concepts should remain separate. Consolidating creates a "wrong abstraction" that obscures intent.
2. **Abstraction would obscure intent** — the extracted function would require complex parameters or conditionals to handle all cases, harming readability
3. **The duplicates may diverge** — business requirements suggest the similar code may evolve differently. Consolidating creates false coupling.
4. **Duplication is in test code** — test code often benefits from explicit, readable duplication rather than abstractions that obscure what each test validates
</tolerance-criteria>

<decision-process>
## Decision Process

When you encounter duplicated code:

### Step 1: Identify the duplication type
- **Textual duplication**: Code looks similar character-by-character
- **Structural duplication**: Code follows the same pattern but with different details
- **Semantic duplication**: Code does the same thing in different ways

### Step 2: Ask the consolidation questions
1. Must these copies change together when requirements change?
2. Can I name the abstraction clearly and specifically?
3. Will consolidation avoid coupling unrelated modules?
4. Is the maintenance burden significant (>2 copies, frequent changes)?

### Step 3: Ask the tolerance questions
1. Do these copies serve genuinely different business purposes?
2. Would abstraction require complex parameters or conditionals?
3. Might these copies diverge as requirements evolve?
4. Is this test code where explicitness aids readability?

### Step 4: Apply the decision rule
- **All consolidation criteria met AND no tolerance criteria apply**: Consolidate
- **Any tolerance criterion applies**: Tolerate (but add a comment if the similarity is striking)
- **Uncertain**: Tolerate — premature abstraction is harder to undo than delayed consolidation
</decision-process>

<warning>
## The Wrong Abstraction

Be alert to the "wrong abstraction" anti-pattern. When you consolidate code that should not be consolidated:

1. The abstraction accumulates conditionals and parameters
2. Changes to one use case break others
3. Developers copy-paste and modify rather than use the abstraction
4. The abstraction name becomes vague ("handleStuff", "processData")

If you observe these signs, consider reverting to explicit duplication and waiting for the correct abstraction to emerge.
</warning>
