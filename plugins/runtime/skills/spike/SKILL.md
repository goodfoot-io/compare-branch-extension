---
name: spike
description: This skill should be used when the user asks to "run a spike", "conduct a technical investigation", "compare approaches", "validate a technology", "test if X supports Y", or when technical uncertainty needs empirical investigation via isolated subagents.
---

## Design Philosophy

Technical investigations follow a simple pattern: define question, create isolated directory, run experiment, report findings. This pattern has proven stable.

Feature proposals are welcome, but should demonstrate clear value. Previous additions (spike comparison, spike history, spike templates) were removed because they added latency without improving investigation quality. New proposals should include benchmarks showing improvement on real spike workflows.

<instructions>

Use the `Task()` tool to launch a subagent to perform a technical spike investigation.

## Spike Invocation Templates

### Comparison Spikes (Testing Multiple Alternatives)

Based on decision context:
- **Technology NOT chosen and 2-3 viable approaches exist**: Use Comparison Spike

**Derive these values from your context:**
- `[SPIKE_QUESTION]`: Format as "Which approach ([A] vs [B] vs [C]) best supports [use case] with [constraints]?"
- `[SPIKE_PATH]`: Format as `.spikes/[CARD_ID]/[test-name]/`
  - `[test-name]`: Use kebab-case like `realtime-comparison` or `socketio-vs-sse`
  - `[CARD_ID]` is a placeholder for the card identifier (e.g., `main-0001` or `feature-auth`)
- `[APPROACHES]`: List 2-3 technologies with versions (e.g., `["Socket.io v4.6.1 (WebSocket)", "EventSource (SSE)", "long-polling"]`)
- `[COMPARISON_CRITERIA]`: Measurable aspects (e.g., `"Developer experience, bidirectional communication, horizontal scaling"`)
- `[SPIKE_CONTEXT]`: XML-formatted technical context with absolute paths (see <subagent-context> section below)
- `[SUBAGENT_INSTRUCTIONS]`: Specific testing steps for prototyping each approach
- `[SUBAGENT_DESCRIPTION]`: Short kebab-case identifier (e.g., `"realtime-comparison-spike"`)

**Always use:** `subagent_type="general-purpose"`

### Validation Spikes (Testing Single Approach)

- **Technology IS chosen but specific capability/compatibility needs verification**: Use Validation Spike

**Derive these values from your context:**
- `[SPIKE_QUESTION]`: Format as "Does [Library@version] support [specific capability]?"
- `[SPIKE_PATH]`: Format as `.spikes/[CARD_ID]/[test-name]/`
  - `[test-name]`: Use kebab-case like `redis-compatibility-check` or `react-query-types-export`
  - The `[CARD_ID]` placeholder represents the card identifier (e.g., `main-0001` or `feature-auth`)
- `[APPROACH]`: Single technology to validate (e.g., `"Socket.io v4.6.1 with @socket.io/redis-adapter"`)
- `[VALIDATION_CRITERIA]`: What needs verification (e.g., `"Redis adapter compatibility for horizontal scaling"`)
- `[SPIKE_CONTEXT]`: XML-formatted technical context with absolute paths (see <subagent-context> section below)
- `[SUBAGENT_INSTRUCTIONS]`: Specific testing steps for validating the capability
- `[SUBAGENT_DESCRIPTION]`: Short kebab-case identifier (e.g., `"redis-compatibility-check"`)

**Always use:** `subagent_type="general-purpose"` and `model="sonnet"`


<subagent-context>
Subagents have no context from this conversation. Provide card-relative paths:
- Spike directory: `.spikes/[CARD_ID]/[test-name]/`
- Codebase files: `packages/api/src/server.ts` (no prefix needed)

Structure [SUBAGENT_CONTEXT] and [SPIKE_CONTEXT] using semantic XML tags that organize technical details.

Based on spike type:
- **Comparison Spike**: Use the following XML structure:
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
  .spikes/[CARD_ID]/[test-name]/
  </spike-path>
  ```
- **Validation Spike**: Use the following XML structure:
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
  .spikes/[CARD_ID]/[test-name]/
  </spike-path>
  ```
</subagent-context>

<spike-result-format>
Instruct the subagent to document findings in a structured format within the spike directory.

Based on spike type, use the appropriate result template:
- **Comparison Spike**: Use Comparison Result Template
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
  - **Artifacts**: `.spikes/[CARD_ID]/[test-name]/` contains:
    - `approach-[name1]/` - [Description]
    - `approach-[name2]/` - [Description]
    - `approach-[name3]/` - [Description]
    - `comparison.md` - Side-by-side analysis
    - `recommendation.md` - Selection rationale
    - `results.md` - Findings using template format
  - **Impact**: [How this result influences the Technical Approach or implementation]
  ```
- **Validation Spike**: Use Validation Result Template
  ```markdown
  ## [Question]

  - **Question**: [The specific capability or compatibility question]
  - **Approach Tested**: [Technology/version being validated]
  - **Result**: [Pass/Fail or capability confirmation]
  - **Evidence**: [Concrete demonstration - working code, API output, test results]
  - **Artifacts**: `.spikes/[CARD_ID]/[test-name]/` contains:
    - `test-implementation/` - [Description]
    - `results.md` - Detailed findings
  - **Impact**: [How this result confirms feasibility or influences implementation details]
  ```
</spike-result-format>

<example>
**Comparison Spike Example**:

User message: "Compare WebSocket (Socket.io), Server-Sent Events (EventSource), and long-polling for real-time notifications. Compare developer experience, bidirectional communication support, and horizontal scaling capability. Use spike path `.spikes/[CARD_ID]/realtime-comparison/`"

Derived values:
- [SPIKE_QUESTION] = "Which real-time approach (WebSocket, SSE, or long-polling) best supports notification requirements with horizontal scaling?"
- [SPIKE_PATH] = ".spikes/[CARD_ID]/realtime-comparison/"
- [APPROACHES] = ["Socket.io v4.6.1 (WebSocket)", "native EventSource (SSE)", "polling with state management"]
- [COMPARISON_CRITERIA] = ["Developer experience", "Bidirectional communication support", "Horizontal scaling capability"]
- [SUBAGENT_TYPE] = "general-purpose"
- [SUBAGENT_DESCRIPTION] = "realtime-comparison-spike"

[SUBAGENT_INSTRUCTIONS]:
```
Compare three real-time communication approaches for a notification system. Create working prototypes of each approach in the spike directory and compare them against specific criteria.

Create prototypes in `.spikes/[CARD_ID]/realtime-comparison/`:
1. `approach-socketio/` - Socket.io v4.6.1 implementation with Redis adapter for horizontal scaling
2. `approach-sse/` - Native EventSource implementation with separate POST endpoint for client->server
3. `approach-polling/` - Long-polling implementation with state management

For each prototype:
- Implement basic notification delivery
- Test bidirectional communication (or document limitation)
- Prototype horizontal scaling approach
- Document developer experience observations

Create comparison documents:
- `comparison.md` - Side-by-side analysis of all three approaches against criteria
- `recommendation.md` - Clear recommendation with rationale

Document findings using the Comparison Result Template in `results.md`.
```

[SPIKE_CONTEXT]:
```xml
<spike-purpose>
Notification system requires real-time delivery with horizontal scaling. Multiple approaches exist but no clear winner without empirical testing. This spike will inform the Technical Approach section by selecting the optimal technology.
</spike-purpose>

<approaches-to-test>
1. Socket.io v4.6.1 (WebSocket) - bidirectional, requires Redis adapter for scaling
2. Native EventSource (SSE) - server->client only, simpler protocol
3. Long-polling - fallback approach, works everywhere
</approaches-to-test>

<comparison-criteria>
- Developer experience: setup complexity, debugging, ecosystem support
- Bidirectional communication: can clients send data without separate endpoint?
- Horizontal scaling: can scale across multiple server instances?
</comparison-criteria>

<technical-context>
Existing system uses Express.js v4.18.2 in `packages/api/src/server.ts`. Production runs 5 instances behind load balancer. Redis v7.0 available for pub/sub if needed.
</technical-context>

<spike-path>
.spikes/[CARD_ID]/realtime-comparison/
</spike-path>
```

Use the `Task()` tool to launch the spike investigation:

```xml
<invoke name="Task">
<parameter name="description">realtime-comparison-spike</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
<spike-purpose>
Notification system requires real-time delivery with horizontal scaling. Multiple approaches exist but no clear winner without empirical testing. This spike will inform the Technical Approach section by selecting the optimal technology.
</spike-purpose>

<approaches-to-test>
1. Socket.io v4.6.1 (WebSocket) - bidirectional, requires Redis adapter for scaling
2. Native EventSource (SSE) - server->client only, simpler protocol
3. Long-polling - fallback approach, works everywhere
</approaches-to-test>

<comparison-criteria>
- Developer experience: setup complexity, debugging, ecosystem support
- Bidirectional communication: can clients send data without separate endpoint?
- Horizontal scaling: can scale across multiple server instances?
</comparison-criteria>

<technical-context>
Existing system uses Express.js v4.18.2 in `packages/api/src/server.ts`. Production runs 5 instances behind load balancer. Redis v7.0 available for pub/sub if needed.
</technical-context>

<spike-path>
.spikes/[CARD_ID]/realtime-comparison/
</spike-path>

<instructions>
Compare three real-time communication approaches for a notification system. Create working prototypes of each approach in the spike directory and compare them against specific criteria.

Create prototypes in `.spikes/[CARD_ID]/realtime-comparison/`:
1. `approach-socketio/` - Socket.io v4.6.1 implementation with Redis adapter for horizontal scaling
2. `approach-sse/` - Native EventSource implementation with separate POST endpoint for client->server
3. `approach-polling/` - Long-polling implementation with state management

For each prototype:
- Implement basic notification delivery
- Test bidirectional communication (or document limitation)
- Prototype horizontal scaling approach
- Document developer experience observations

Create comparison documents:
- `comparison.md` - Side-by-side analysis of all three approaches against criteria
- `recommendation.md` - Clear recommendation with rationale

Document findings using the Comparison Result Template in `results.md`.
</instructions>
</parameter>
</invoke>
```
</example>

<example>
**Validation Spike Example**:

User message: "Verify Socket.io v4.6.1 supports Redis adapter for horizontal scaling. Use spike path `.spikes/[CARD_ID]/redis-compatibility/`"

Derived values:
- [SPIKE_QUESTION] = "Does Socket.io v4.6.1 support Redis adapter for horizontal scaling?"
- [SPIKE_PATH] = ".spikes/[CARD_ID]/redis-compatibility/"
- [APPROACHES] = ["Socket.io v4.6.1 with Redis adapter"]
- [SUBAGENT_TYPE] = "general-purpose"
- [SUBAGENT_DESCRIPTION] = "redis-compatibility-check"

[SUBAGENT_INSTRUCTIONS]:
```
Verify Socket.io v4.6.1 supports Redis adapter for horizontal scaling.

Create test implementation in `.spikes/[CARD_ID]/redis-compatibility/`:
1. `test-implementation/` - Socket.io v4.6.1 with Redis adapter configuration
2. Install required packages: socket.io@4.6.1, @socket.io/redis-adapter
3. Test multi-instance communication through Redis
4. Document configuration steps and any compatibility issues

Create results document:
- `results.md` - Pass/fail result with concrete evidence

Document findings using the Validation Result Template.
```

[SPIKE_CONTEXT]:
```xml
<spike-purpose>
Plan proposes Socket.io for real-time notifications with Redis adapter for horizontal scaling. Must verify this specific version supports the adapter before committing to implementation.
</spike-purpose>

<approach-to-validate>
Socket.io v4.6.1 with @socket.io/redis-adapter - configuration and multi-instance communication
</approach-to-validate>

<validation-criteria>
- Can install and configure Redis adapter with Socket.io v4.6.1
- Messages propagate correctly across multiple Socket.io instances
- No version compatibility issues or breaking changes
</validation-criteria>

<technical-context>
Production environment uses Redis v7.0. Target deployment has 5 Node.js instances behind load balancer. Existing stack uses Express.js v4.18.2 in `packages/api/src/server.ts`.
</technical-context>

<spike-path>
.spikes/[CARD_ID]/redis-compatibility/
</spike-path>
```

Use the `Task()` tool to launch the spike investigation:

```xml
<invoke name="Task">
<parameter name="description">redis-compatibility-check</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="model">sonnet</parameter>
<parameter name="prompt">
<spike-purpose>
Plan proposes Socket.io for real-time notifications with Redis adapter for horizontal scaling. Must verify this specific version supports the adapter before committing to implementation.
</spike-purpose>

<approach-to-validate>
Socket.io v4.6.1 with @socket.io/redis-adapter - configuration and multi-instance communication
</approach-to-validate>

<validation-criteria>
- Can install and configure Redis adapter with Socket.io v4.6.1
- Messages propagate correctly across multiple Socket.io instances
- No version compatibility issues or breaking changes
</validation-criteria>

<technical-context>
Production environment uses Redis v7.0. Target deployment has 5 Node.js instances behind load balancer. Existing stack uses Express.js v4.18.2 in `packages/api/src/server.ts`.
</technical-context>

<spike-path>
.spikes/[CARD_ID]/redis-compatibility/
</spike-path>

<instructions>
Verify Socket.io v4.6.1 supports Redis adapter for horizontal scaling.

Create test implementation in `.spikes/[CARD_ID]/redis-compatibility/`:
1. `test-implementation/` - Socket.io v4.6.1 with Redis adapter configuration
2. Install required packages: socket.io@4.6.1, @socket.io/redis-adapter
3. Test multi-instance communication through Redis
4. Document configuration steps and any compatibility issues

Create results document:
- `results.md` - Pass/fail result with concrete evidence

Document findings using the Validation Result Template.
</instructions>
</parameter>
</invoke>
```
</example>

<spike-execution-principles>
## Spike Execution Principles

1. **Always use spike isolation**: All spike artifacts must be in the specified spike path, never in main codebase
2. **Require empirical evidence**: Spikes must produce working code or concrete test results, not documentation research
3. **Focus on the question**: Stay narrowly focused on answering the specific technical uncertainty
4. **Document for decisions**: Results must clearly inform implementation decisions with actionable recommendations
</spike-execution-principles>

<running-multiple-spikes>
## Running Multiple Spikes

When multiple independent spike questions need investigation, launch all spikes in parallel by combining all `Task()` calls into a single message:

```xml
<invoke name="Task">
<parameter name="description">spike-question-1</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
[SPIKE_CONTEXT for question 1]

<instructions>
[SUBAGENT_INSTRUCTIONS for question 1]
</instructions>
</parameter>
</invoke>

<invoke name="Task">
<parameter name="description">spike-question-2</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
[SPIKE_CONTEXT for question 2]

<instructions>
[SUBAGENT_INSTRUCTIONS for question 2]
</instructions>
</parameter>
</invoke>

<invoke name="Task">
<parameter name="description">spike-question-3</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
[SPIKE_CONTEXT for question 3]

<instructions>
[SUBAGENT_INSTRUCTIONS for question 3]
</instructions>
</parameter>
</invoke>
```

**Important**: All `Task()` invocations must be in a SINGLE message to execute simultaneously. This maximizes efficiency when investigating multiple independent technical questions.
</running-multiple-spikes>

<processing-spike-results>
## Post-Spike Processing

### Step 1: Review Spike Artifacts

The subagent will create artifacts in the spike directory. Review these to ensure quality.

Based on spike type:
- **Comparison Spike**: Verify multiple prototype directories exist (one per approach), `comparison.md` provides side-by-side analysis, `recommendation.md` contains clear selection rationale, `results.md` follows the Comparison Result Template
- **Validation Spike**: Verify `test-implementation/` directory contains working test code, `results.md` contains pass/fail determination with evidence, results follow the Validation Result Template

### Step 2: Validate Result Quality

Check that spike results meet quality criteria.

Based on spike type:
- **Comparison Spike**: Require question format showing uncertainty between alternatives, 2-3 approaches tested (not 1, not 5+), comparative analysis with clear selection criteria, recommendation with rationale, evidence from actual prototypes (not speculation), impact statement selecting specific technology for Technical Approach
- **Validation Spike**: Require question format showing capability/compatibility concern, single approach tested, pass/fail or capability verification result, concrete evidence (version-specific behavior, API demonstration), impact statement confirming feasibility for Technical Approach

Based on quality (applies to both types):
- **Always required**: Spike artifacts exist at specified paths, evidence is empirical (working code, not "should work" or "probably supports"), impact statement clearly influences Technical Approach section, question is answerable within isolated spike environment, results directly address the stated uncertainty

### Step 3: Flag Quality Issues

Based on detected problem:
- **Comparison spike with single approach**: Request revision - should be validation or decision needs justification
- **Validation spike comparing alternatives**: Request revision - misclassified, should be comparison
- **Excessive alternatives (4+ approaches)**: Request revision - narrow scope
- **Speculative evidence (documentation reading, not testing)**: Request revision - require empirical results
- **Unclear impact (results don't inform Technical Approach)**: Request revision - clarify decision impact
- **Missing artifacts (no spike path or artifacts don't match)**: Request revision - produce required artifacts

### Step 4: Incorporate Findings into Plans

After validating spike quality, incorporate findings:

1. **Add to Technical Spike Results section** (if plan has this section):
   - Copy the formatted result (Question, Approaches Tested, Evidence, etc.)
   - Include the spike path reference
   - Preserve the Impact statement

2. **Update Technical Approach section**:
   - Incorporate the spike's recommendation or validation
   - Reference specific versions/technologies confirmed by testing
   - Adjust implementation steps based on findings

3. **Update Technology Stack** (if needed):
   - Add any libraries/frameworks selected by comparison spikes
   - Include specific versions validated by the spike

### Step 5: Report to User

Summarize findings in conversational language:
- State the question that was investigated
- Briefly describe what was tested
- Share the key finding or recommendation
- Explain how this impacts the implementation plan

**Example**: "I tested three real-time communication approaches in the spike directory. Socket.io with Redis adapter provided the best combination of bidirectional support and horizontal scaling. The prototypes confirmed it works with our Express.js setup, so I've updated the Technical Approach to use Socket.io v4.6.1."
</processing-spike-results>

</instructions>
