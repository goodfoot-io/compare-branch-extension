---
name: card-clarify-and-enrich
description: Clarify and enrich cards before implementation.
---


<instructions>

## 1. Triage Prior Clarification

Read the card description and comments in the card repository to understand the requirements and comment history.

Based on comments and prior clarification requests:

- **No existing "## Clarification Needed" comment**: Proceed to Step 2.

- **Existing clarification request AND later comment from non-agent author**: Write a comment acknowledging the new information and how it affects requirements analysis. Commit. Proceed to Step 4.

  ```bash
  cd !` echo $CARD_REPO_PATH`
  cat <<'EOF' > comment/clarification-received.md
  [acknowledge the new information and explain how it affects requirements analysis]
  EOF
  git add comment/clarification-received.md
  git commit -m "[single sentence summarizing the new information and how it affects requirements]"  # <card-repo-commit-style>
  ```

- **Existing clarification request AND no new user response**: Write a comment confirming you are still waiting, referencing which questions remain unanswered. Commit and **STOP**.

  ```bash
  cd !` echo $CARD_REPO_PATH`
  cat <<'EOF' > comment/clarification-pending.md
  [confirm still waiting; reference which questions from the prior clarification request remain unanswered]
  EOF
  git add comment/clarification-pending.md
  git commit -m "[single sentence noting which questions from the prior request remain unanswered]"  # <card-repo-commit-style>
  ```

## 2. Research and Enrich

### 2.1 Research Workspace

Trace code and data flow paths in the workspace to gather file paths, component names, and patterns relevant to the card. Use whatever combination of searches, reads, and tools best fits the card content.

### 2.2 Enrich Card

Evaluate whether the title and description are clear enough and enrich them with context discovered during exploration.

#### For implementation cards

A good title completes the sentence: *"To finish this card, I need to [TITLE]"*

**Clarify title when:**
- Title is truncated, incomplete, or does not start with an action verb
- Title describes symptom rather than the work (e.g., "Page is slow" -> "Optimize database queries")
- Title references wrong component, file, or feature

**Clarify description when:**
- Description contains factual errors (wrong paths, incorrect component names)
- Description lacks context needed to begin work

**Enrich descriptions** with context discovered during exploration. Follow the `<markdown-guidelines>` in the `cards:markdown` skill for all file references, code locations, and diagrams:
- Relevant file paths and component names
- Technical constraints or dependencies
- Acceptance criteria (if inferable from user intent)

#### For bug cards

A good bug title describes behavior: *"[Component] fails when [action]"* or *"[Expected] but [actual]"*.

**Clarify title when:**
- Title is truncated or incomplete
- Title describes implementation detail rather than observable behavior
- Title references wrong component, file, or feature

**Clarify description when:**
- Description contains factual errors (wrong paths, incorrect component names)
- Error messages or stack traces are missing but available

**Enrich descriptions** with context discovered during exploration:
- Correct file paths and component names
- Related error messages or stack traces
- Environment or configuration details (if relevant)

#### Common principles

**Leave unchanged when:** Only minor phrasing or style preferences would change.

**Clarification principles:**
- Preserve all user-provided details, requirements, constraints, error messages, and reproduction steps
- Maintain user intent — the clarified version must request the same outcome or describe the same bug
- Correct factual errors in the main text; append a footnote: `*Corrections: Changed X to Y (reason)*`
- Do not expand scope beyond user intent

If changes are needed, update `CARD.meta.json` (for title) and/or `CARD.md` (for description) in the card repository. Write or update `CARD.md.meta.json` with `title` set to `"Description"` and `summary` (100–300 words: the problem or need that triggered the card). Follow the `<markdown-guidelines>` in the `cards:markdown` skill. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
git add CARD.meta.json CARD.md CARD.md.meta.json
git commit -m "[single sentence summarizing what was corrected or enriched in the card]"  # <card-repo-commit-style>
```

Skip the commit entirely if no enrichment or clarification is needed.

## 3. Evaluate Readiness

### 3.1 Check Definition of Ready

Mark as MISSING if not present or inferable from card description, comments, and exploration:

- **Commander's intent**: What this change should achieve and why
- **Acceptance criteria**: Testable completion conditions
- **Dependencies**: Blockers or prerequisites
- **Technical feasibility**: Enough detail to determine approach
- **Unanswered questions**: All comment questions answered

**All met (DOR satisfied)**: Proceed to Step 4.

### 3.2 Research Context

Search the workspace codebase for keywords from the card description:
1. Look for similar implementations
2. Check tests for expected behavior
3. Identify relevant file paths for code references

- **Research resolves all gaps**: Write findings as a comment to the card repository and commit. Proceed to Step 4.

  ```bash
  cd !` echo $CARD_REPO_PATH`
  cat <<'EOF' > comment/research-findings.md
  [research findings: relevant implementations found, expected behaviors from tests, file paths with code references that resolve the missing requirements]
  EOF
  git add comment/research-findings.md
  git commit -m "[single sentence summarizing the research findings that resolved requirement gaps]"  # <card-repo-commit-style>
  ```

### 3.3 Request Clarification

Write a comment presenting specific questions needed to proceed. Prioritize by what is most blocking, explain why each is needed, and reference relevant workspace code.

```bash
cd !` echo $CARD_REPO_PATH`
cat <<'EOF' > comment/clarification-request.md
[specific questions needed to proceed, prioritized by what is most blocking, with explanation of why each is needed and references to relevant workspace code]
EOF
git add comment/clarification-request.md
git commit -m "[single sentence summarizing which requirements are missing and what is needed to proceed]"  # <card-repo-commit-style>
```

**STOP** — awaiting user response.

## 4. Re-route After Enrichment

Load the `runtime:card-routing` skill to re-evaluate the card's state and route to the appropriate next skill. On this second pass, routes 6 (IS_STALE) and 9 (NOT DOR_MET) are skipped — enrichment has already been attempted this session.

```xml
<invoke name="Skill">
<parameter name="skill">runtime:card-routing</parameter>
</invoke>
```

</instructions>
