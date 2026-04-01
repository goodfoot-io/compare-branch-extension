---
name: spike
description: Investigate technical uncertainty via isolated subagent spikes.
---

Technical investigations follow: define question, create isolated directory, run experiment, report findings.

<instructions>

Use the `Task()` tool to launch a subagent to perform a technical spike investigation.

## Spike Invocation Templates

### Comparison Spikes (Testing Multiple Alternatives)

- **Technology NOT chosen and 2-3 viable approaches exist**: Use Comparison Spike

**Derive these values from your context:**
- `[SPIKE_QUESTION]`: Format as "Which approach ([A] vs [B] vs [C]) best supports [use case] with [constraints]?"
- `[SPIKE_PATH]`: !` echo $CARD_REPO_PATH`/spike/[test-name]/
  - `[test-name]`: Use kebab-case like `realtime-comparison` or `socketio-vs-sse`
- `[APPROACHES]`: List 2-3 technologies with versions (e.g., `["Socket.io v4.6.1 (WebSocket)", "EventSource (SSE)", "long-polling"]`)
- `[COMPARISON_CRITERIA]`: Measurable aspects (e.g., `"Developer experience, bidirectional communication, horizontal scaling"`)
- `[SPIKE_CONTEXT]`: XML-formatted technical context with absolute paths (see <subagent-context> section below)
- `[SUBAGENT_INSTRUCTIONS]`: Specific testing steps for prototyping each approach
- `[SUBAGENT_DESCRIPTION]`: Short kebab-case identifier (e.g., `"realtime-comparison-spike"`)

**Always use:** `subagent_type="general-purpose"`

### Validation Spikes (Testing Single Approach)

- **Technology chosen but capability/compatibility needs verification**: Use Validation Spike

**Derive these values from your context:**
- `[SPIKE_QUESTION]`: Format as "Does [Library@version] support [specific capability]?"
- `[SPIKE_PATH]`: !` echo $CARD_REPO_PATH`/spike/[test-name]/
  - `[test-name]`: Use kebab-case like `redis-compatibility-check` or `react-query-types-export`
- `[APPROACH]`: Single technology to validate (e.g., `"Socket.io v4.6.1 with @socket.io/redis-adapter"`)
- `[VALIDATION_CRITERIA]`: What needs verification (e.g., `"Redis adapter compatibility for horizontal scaling"`)
- `[SPIKE_CONTEXT]`: XML-formatted technical context with absolute paths (see <subagent-context> section below)
- `[SUBAGENT_INSTRUCTIONS]`: Specific testing steps for validating the capability
- `[SUBAGENT_DESCRIPTION]`: Short kebab-case identifier (e.g., `"redis-compatibility-check"`)

**Always use:** `subagent_type="general-purpose"` and `model="sonnet"`


<subagent-context>
Subagents have no context from this conversation. Provide absolute paths:
- Spike directory: !` echo $CARD_REPO_PATH`/spike/[test-name]/
- Card plan: !` echo $CARD_REPO_PATH`/PLAN.md (when the spike needs implementation context)
- Codebase files: absolute workspace paths (e.g., `/workspace/packages/api/src/server.ts`)

Structure [SUBAGENT_CONTEXT] and [SPIKE_CONTEXT] using semantic XML tags.

- **Comparison Spike**:
  ```xml
  <spike-purpose>
  [Why this investigation is needed and what decision depends on it]
  </spike-purpose>

  <approaches-to-test>
  [List of 2-3 specific approaches/technologies to prototype and compare]
  </approaches-to-test>

  <comparison-criteria>
  [Specific criteria for comparison - e.g., developer experience, scaling capability, performance]
  </comparison-criteria>

  <technical-context>
  [Relevant technical constraints, requirements, or existing patterns]
  </technical-context>

  <spike-path>
  !` echo $CARD_REPO_PATH`/spike/[test-name]/
  </spike-path>
  ```
- **Validation Spike**:
  ```xml
  <spike-purpose>
  [Why this validation is needed and what implementation step depends on it]
  </spike-purpose>

  <approach-to-validate>
  [Specific technology, library version, or integration to test]
  </approach-to-validate>

  <validation-criteria>
  [What needs to be verified - specific capability, API behavior, compatibility]
  </validation-criteria>

  <technical-context>
  [Relevant technical constraints, version requirements, or integration points]
  </technical-context>

  <spike-path>
  !` echo $CARD_REPO_PATH`/spike/[test-name]/
  </spike-path>
  ```
</subagent-context>

<spike-result-format>
Instruct the subagent to document findings in a structured format within the spike directory.

- **Comparison Spike**:
  ```markdown
  ## [Question]

  - **Question**: [The technical question being investigated]
  - **Approaches Tested**: [Approach 1, Approach 2, Approach 3]
  - **Comparison Criteria**: [Criterion 1, Criterion 2, Criterion 3]
  - **Result**: [Recommendation with rationale]
  - **Evidence**:
    - [Approach 1]: [Specific findings from prototype]
    - [Approach 2]: [Specific findings from prototype]
    - [Approach 3]: [Specific findings from prototype]
  - **Artifacts**: !` echo $CARD_REPO_PATH`/spike/[test-name]/ contains:
    - `approach-[name1]/` - [Description]
    - `approach-[name2]/` - [Description]
    - `approach-[name3]/` - [Description]
    - `comparison.md` - Side-by-side analysis
    - `recommendation.md` - Selection rationale
    - `results.md` - Findings using template format
  - **Impact**: [How this result influences the plan's approach or implementation]
  ```
- **Validation Spike**:
  ```markdown
  ## [Question]

  - **Question**: [The specific capability or compatibility question]
  - **Approach Tested**: [Technology/version being validated]
  - **Result**: [Pass/Fail or capability confirmation]
  - **Evidence**: [Concrete demonstration - working code, API output, test results]
  - **Artifacts**: !` echo $CARD_REPO_PATH`/spike/[test-name]/ contains:
    - `test-implementation/` - [Description]
    - `results.md` - Detailed findings
  - **Impact**: [How this result confirms feasibility or influences implementation details]
  ```
</spike-result-format>

Assemble the Task() invocation by composing the spike-context XML and subagent instructions into the prompt parameter.

<spike-execution-principles>
## Spike Execution Principles

1. Place all spike artifacts in !` echo $CARD_REPO_PATH`/spike/, never in the main codebase
2. Produce working code or concrete test results, not documentation research
3. Stay narrowly focused on the specific technical uncertainty
4. Results must clearly inform implementation decisions with actionable recommendations
</spike-execution-principles>

<running-multiple-spikes>
## Running Multiple Spikes

When multiple independent spike questions need investigation, launch all spikes in parallel by combining all `Task()` calls into a single message:

```xml
<invoke name="Agent">
<parameter name="description">spike-question-1</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
[SPIKE_CONTEXT for question 1]

<instructions>
[SUBAGENT_INSTRUCTIONS for question 1]
</instructions>
</parameter>
</invoke>

<invoke name="Agent">
<parameter name="description">spike-question-2</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
[SPIKE_CONTEXT for question 2]

<instructions>
[SUBAGENT_INSTRUCTIONS for question 2]
</instructions>
</parameter>
</invoke>
```

All `Task()` invocations must be in a SINGLE message to execute simultaneously.
</running-multiple-spikes>

<processing-spike-results>
## Post-Spike Processing

### Step 1: Review Spike Artifacts

Review subagent artifacts in the spike directory.

- **Comparison Spike**: Verify multiple prototype directories (one per approach), `comparison.md` with side-by-side analysis, `recommendation.md` with selection rationale, `results.md` following the template
- **Validation Spike**: Verify `test-implementation/` with working test code, `results.md` with pass/fail determination and evidence

### Step 2: Validate Result Quality

Check that spike results meet quality criteria.

- **Comparison Spike**: Require:
  - Question format showing uncertainty between alternatives
  - 2-3 approaches tested (not 1, not 5+)
  - Comparative analysis with clear selection criteria
  - Recommendation with rationale
  - Evidence from actual prototypes (not speculation)
  - Impact statement selecting specific technology for the plan's approach
- **Validation Spike**: Require:
  - Question format showing capability/compatibility concern
  - Single approach tested
  - Pass/fail or capability verification result
  - Concrete evidence (version-specific behavior, API demonstration)
  - Impact statement confirming feasibility for the plan's approach
- **Both types**: Spike artifacts exist at specified paths, evidence is empirical, impact statement influences the plan's approach, results directly address the stated uncertainty

### Step 3: Flag Quality Issues

Request revision when:
- **Comparison spike with single approach**: Should be validation, or decision needs justification
- **Validation spike comparing alternatives**: Misclassified — should be comparison
- **Excessive alternatives (4+ approaches)**: Narrow scope
- **Speculative evidence (documentation reading, not testing)**: Require empirical results
- **Unclear impact (results don't inform the plan's approach)**: Clarify decision impact
- **Missing artifacts**: Produce required artifacts

### Step 4: Commit Spike Artifacts

After passing quality checks, commit spike artifacts to the card repo:

```bash
cd $CARD_REPO_PATH
git add spike/[test-name]/
git commit -m "[single sentence summarizing the spike's question and finding]"  # <card-repo-commit-style>
```

### Step 5: Incorporate Findings into Plans

After committing, incorporate findings:

1. **Add to the plan's spike results section** (if present): Copy formatted result with spike path reference and Impact statement
2. **Update the plan's approach**: Incorporate recommendation/validation, reference confirmed versions/technologies, adjust implementation steps
3. **Update Technology Stack** (if needed): Add libraries/frameworks and versions validated by the spike

### Step 6: Report to User

Summarize: the question investigated, what was tested, the key finding, and how it impacts the implementation plan.
</processing-spike-results>

</instructions>
