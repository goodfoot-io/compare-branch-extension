---
name: plan-abbreviated
description: Lightweight implementation plans for cards without approval gates.
---

<annotated-plan-example>

### Problem Statement

<example>
```markdown
## Implementation Plan

The submit endpoint currently has no rate limiting, allowing any client to send unlimited requests. This causes database contention during traffic spikes and has triggered two outages in the past month.
```
</example>

<instructions>
Start every plan with `## Implementation Plan` followed directly by the problem statement (2-4 sentences).

The problem statement must:
1. Explain the current state and its limitations
2. Describe the negative impact on users or the system
3. Make clear why this needs to be solved now
4. Avoid proposing solutions (save for Technical Approach)
</instructions>

---

### Goals & Objectives

<example>
```markdown
## Goals & Objectives
- [ ] Rate-limit the /api/submit endpoint to 60 requests/minute per client
- [ ] Return 429 with Retry-After header when limited
- [ ] Log rate-limit events for monitoring
```
</example>

<instructions>
Write 3-7 specific, measurable goals using checkbox format: `- [ ]`

Each goal must be:
- Verifiable (you can definitively check if it's done)
- An outcome, not a process (what will exist, not how to build)
- Directly addressing the card's requirements
</instructions>

---

### Technical Approach

<example>
```markdown
## Technical Approach
1. **Create rate limiter utility** (`src/utils/rate-limiter.ts`)
   - Implement token bucket algorithm
   - Export createRateLimiter(options) factory

2. **Add rate limit middleware** (`src/middleware/rate-limit.ts`)
   - Wrap utility for Express middleware signature
   - Return 429 with Retry-After header when limited

3. **Integrate into submit route** (`src/routes/api/submit.ts:45`)
   - Apply middleware before existing handler
   - Use config values for rate limits

4. **Write tests** (`src/utils/rate-limiter.test.ts`, `src/routes/api/submit.test.ts`)
   - Unit tests for token bucket logic
   - Integration test for 429 response
```
</example>

<instructions>
Numbered steps with verified file paths. Describe WHAT to build and WHERE, not HOW.

- Number each step sequentially
- Include file paths as inline markdown links — soft links for prose references and precise anchors for step locations (`[src/middleware/rate-limit.ts L45](./src/middleware/rate-limit.ts#L45)` or a range `[src/middleware/rate-limit.ts L45–L60](./src/middleware/rate-limit.ts#L45-L60)`)
- Skip line numbers for new files
- Keep each step focused on a single concern
</instructions>

---

### Validation Commands

<example>
```markdown
## Validation Commands
- Type check: `cd packages/api && yarn typecheck`
- Lint: `cd packages/api && yarn lint`
- Test: `cd packages/api && yarn test`
```
</example>

<instructions>
Mandatory. Minimum: typecheck, test, lint. Format as self-contained commands that `cd` into the affected package before invoking the script.

For multiple packages, group by package with a subheading.
</instructions>

---

### Scope (when warranted)

<example>
```markdown
## Scope

### Include
- Rate limiting on /api/submit endpoint
- 429 response with Retry-After header
- Per-client tracking by IP address

### Exclude
- Rate limiting on other endpoints
- Distributed rate limiting across instances
- Admin dashboard for rate limit configuration
```
</example>

<instructions>
Include/Exclude lists. Add when the card touches 4+ files or the boundary between in-scope and out-of-scope work is ambiguous.

The Exclude section prevents scope creep — explicitly list what will NOT be built.
</instructions>

---

### Risks & Mitigations (when warranted)

<example>
```markdown
## Risks & Mitigations
- **Risk**: Shared IP behind NAT could rate-limit legitimate users
  **Mitigation**: Use API key when available, fall back to IP

- **Risk**: In-memory rate state lost on restart
  **Mitigation**: Acceptable for v1; document as known limitation
```
</example>

<instructions>
3-5 items. Add when there are genuine technical risks — not generic worries.

Format each as:
- **Risk**: [Specific technical concern]
  **Mitigation**: [Concrete solution or approach]
</instructions>

</annotated-plan-example>

<instructions>

## 1. Complexity Calibration

Select sections based on card scope:

| Scope | Required | Add if warranted |
|-------|----------|------------------|
| 1-3 files | Problem, Goals, Approach, Validation | — |
| 4-10 files | Problem, Goals, Approach, Validation | Scope, Risks |
| 10+ files | Problem, Goals, Approach, Validation, Scope, Risks | — |

---

## 2. Writing the Plan

Write the plan to `PLAN.md` in the card repository following the `<annotated-plan-example>` above. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > PLAN.md
[plan content per <annotated-plan-example>]
EOF
git add PLAN.md
git commit -m "[single sentence summarizing the plan's approach]"  # <card-repo-commit-style>
```

---

## 3. Key Principles

- **Precision**: Verified file paths with line numbers, linked inline (`[src/middleware/rate-limit.ts L45](./src/middleware/rate-limit.ts#L45)`). No guessing.
- **WHAT not HOW**: Plans answer "what" and "where." Implementation answers "how."
- **Standalone**: The plan is readable without card comments or conversation context.
- **Minimal**: Include only sections that add value for this specific card. A plan for a 2-file change should be short.
- **No meta-commentary**: No "Based on exploration..." or "I decided to..." — just the plan content.

---

## 4. Reviewing a Plan

When reviewing (not authoring) a plan, assess:

1. **Completeness**: Does the plan cover all requirements from the card?
2. **Precision**: Are file paths verified? Are goals measurable?
3. **Scope**: Are boundaries clear? Will the implementer know when to stop?
4. **Risks**: Are genuine technical risks identified?
5. **Validation**: Are validation commands present and correct for affected packages?
6. **Feasibility**: Can the technical approach actually achieve the stated goals?

</instructions>
