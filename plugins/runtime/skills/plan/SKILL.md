---
name: plan
description: Create and review implementation plans for approval.
---

This skill defines how to structure implementation plans stored as PLAN.md in card repositories. Plans require user approval before implementation begins.

## Complexity Tiers

Select sections based on the *type* of change, not the number of files touched:

### Tier 1: Surgical Changes
*Single known fix — no new wiring between components, no new architectural patterns, clear scope*

Required sections:
- Problem Statement
- Goals & Objectives
- Technical Approach
- Validation Commands

### Tier 2: Features and Modifications
*New behavior, existing flow modified, any new wiring between components, or multiple integration points*

Add to Tier 1:
- Scope (Include/Exclude)
- Dependency Analysis
- Risks & Mitigations

### Tier 3: Architectural Changes
*New systems, new patterns, significant unknowns, or cross-cutting changes*

Add to Tier 2:
- Framework & Technology Stack
- Technical Spike Results
- Implementation References
- Open Questions

When in doubt, use the higher tier. A Scope section on a surgical plan costs nothing; a missing Risks section on a plan that needed one costs a revision.

---

<quick-reference>
## Quick Reference

### Always Required (All Tiers)
- `## Implementation Plan` header
- Problem Statement (2-4 sentences)
- Goals & Objectives (3-7 checkbox items)
- Technical Approach (numbered steps with file paths)
- Validation Commands (typecheck, test, lint minimum)

### Include for Tier 2+
- Scope (Include AND Exclude)
- Dependency Analysis (high-impact files + integration points)
- Risks & Mitigations (3-5 items)

### Include for Tier 3
- Framework & Technology Stack
- Technical Spike Results
- Implementation References
- Open Questions

### Never Include in Plan Comment
- YAML front matter
- Version numbers in title
- Revision notes or change summaries
- Conversational preamble ("Based on your feedback...")
- References to previous plan versions

### Key Rules
- Verified file paths with line numbers
- WHAT to build, not HOW
- Exclude v2 features explicitly
- No implementation details
- No guessed file paths
- No vague goals
- Plan must be standalone
</quick-reference>

---

<annotated-plan-example>

### Header Format

<example>
```markdown
## Implementation Plan

The application currently lacks real-time notification capabilities, requiring users to manually refresh pages to see updates. This leads to delayed awareness of important events, reduced user engagement, and a subpar experience compared to modern web applications.
```
</example>

<instructions>
Plans inherit their title from the parent card. Start every plan with `## Implementation Plan` followed directly by the problem statement (2-4 sentences).

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
- [ ] Create notification queue with priority-based ordering
- [ ] Implement real-time delivery via WebSocket connections
- [ ] Build notification center UI with read/unread states
- [ ] Add user preference controls for notification types
- [ ] Ensure notifications persist across page refreshes
- [ ] Support batching for high-frequency event streams
```
</example>

<instructions>
Write 3-7 specific, measurable goals using checkbox format: `- [ ]`

Each goal must be:
- Verifiable (you can definitively check if it's done)
- An outcome, not a process (what will exist, not how to build)
- Directly addressing the user's request

Bad: "Make notifications better", "Research libraries", "Try to add real-time"
Good: "Process 100+ notifications/second without UI lag", "Unread count updates within 500ms"
</instructions>

---

### Scope

<example>
```markdown
## Scope

### Include
- In-app notification delivery and display
- Real-time updates via WebSocket connections
- Notification center dropdown component
- User preference storage and enforcement
- Read/unread state management
- Sound/badge indicators for new notifications

### Exclude
- Email notification delivery
- Push notifications to mobile devices
- SMS or other external channels
- Notification scheduling/delayed delivery
- Rich media attachments (images, files)
- Notification analytics or tracking
```
</example>

<instructions>
Define clear boundaries for what is and isn't part of this project.

### Include
- List all features that WILL be built
- Be specific about technical limits (e.g., "100 notifications/second")
- Reference existing systems you'll integrate with
- If the implementation makes existing code obsolete — replaces a component, supersedes an event, removes a dependency — list it here. Omitting planned deletions from scope creates a dead code accumulation: the problem statement identifies waste, the plan leaves it in place.

### Exclude (CRITICAL - prevents scope creep)
- Explicitly list what will NOT be built
- Features deferred to future versions
- Related functionality that's out of scope
- Platforms or use cases not being addressed

The Exclude section saves more time than any other part by preventing scope creep.
</instructions>

---

### Framework & Technology Stack

<example>
```markdown
## Framework & Technology Stack

### Core Technologies
- Node.js: v20.11.0
- React: react@18.2.0
- TypeScript: typescript@5.3.3

### Frameworks
- Next.js: next@14.1.0 (App Router)
- Express: express@4.18.2

### Testing
- Jest: jest@29.7.0
- Playwright: @playwright/test@1.41.0
- Testing Library: @testing-library/react@14.1.2

### Key Libraries
- WebSocket: socket.io@4.6.1 - Real-time communication
- State Management: zustand@4.5.0 - Client state management
- Validation: zod@3.22.4 - Schema validation
- Database: @prisma/client@5.8.0 - ORM

### Version-Specific Features Used
- React (react@18.2.0): Suspense boundaries, concurrent rendering
- Node.js v20.11.0: Native WebCrypto API, stable test runner
- TypeScript (typescript@5.3.3): satisfies operator, const type parameters
```
</example>

<instructions>
Document all framework and library versions that constrain the implementation. Include for Tier 3 complexity or when adding new dependencies.

### Required Structure
1. **Core Technologies**: Node.js, React, TypeScript versions
2. **Frameworks**: Next.js, Express, etc.
3. **Testing**: Test runners and libraries
4. **Key Libraries**: Important dependencies with purpose
5. **Version-Specific Features Used**: Features that depend on specific versions

### Common Formats (all acceptable)
- Node.js: v20.11.0 or 20.11.0
- React: react@18.2.0 or 18.2.0
- TypeScript: typescript@5.3.3 or 5.3.3
- Exact versions preferred over ranges for reproducibility
- Add purpose for key libraries when helpful
</instructions>

---

### Technical Spike Results (When Needed)

<instructions>
Include this section for Tier 3 complexity when technical investigations were conducted. Document spike results that informed the Technical Approach.

For each spike, include:
- **Type**: Strategic (comparing alternatives) or Tactical (validating chosen approach)
- **Question**: The specific uncertainty being investigated
- **Approaches Tested** or **Approach Tested**: What was evaluated
- **Result**: The finding or recommendation
- **Evidence**: Concrete data supporting the result
- **Artifacts**: Path to spike code (cleaned up before commit)
- **Impact**: How this affects the Technical Approach
</instructions>

<example>
```markdown
## Technical Spike Results

### Real-Time Communication Approach Selection

**Type:** Strategic Spike

- **Question**: Which real-time approach (WebSocket, Server-Sent Events, or long-polling) best supports notification requirements with horizontal scaling?
- **Approaches Tested**: Socket.io v4.6.1 (WebSocket), native EventSource (SSE), polling with state management
- **Comparison Criteria**: Bidirectional communication support, horizontal scaling capability with Redis, developer experience
- **Result**: Socket.io recommended - provides bidirectional communication, scales with Redis adapter, better developer experience
- **Evidence**:
  - WebSocket (Socket.io): Bidirectional communication working, <50ms latency, Redis pub/sub integration tested successfully
  - SSE (EventSource): Server->client only, requires separate POST endpoint for client->server
  - Polling: Functional but 23% higher server CPU usage, more complex state synchronization
- **Artifacts**: `.spikes/!` echo $CARD_ID`/realtime-comparison/` (cleaned up before commit)
- **Impact**: Selected Socket.io as Technical Approach; enables bidirectional real-time features with horizontal scaling via Redis adapter

### Socket.io Redis Adapter Compatibility

**Type:** Tactical Spike

- **Question**: Does Socket.io v4.6.1 support Redis adapter for cross-instance message broadcasting?
- **Approach Tested**: Created minimal Socket.io server with @socket.io/redis-adapter, tested multi-instance communication
- **Result**: Confirmed v4.6.1 supports Redis adapter with connection state sharing
- **Evidence**: Successfully broadcast messages across 3 server instances, verified in spike test
- **Artifacts**: `.spikes/!` echo $CARD_ID`/socketio-redis-test/` (cleaned up before commit)
- **Impact**: Can proceed with horizontal scaling approach; no single-server bottleneck
```
</example>

---

### Technical Approach

<example>
```markdown
## Technical Approach
1. **Create notification store interface** (packages/web/src/stores/notification-store.ts)
   - Add `notifications: Notification[]` array to state
   - Add `unreadCount: number` computed property
   - Implement queue management with priority sorting

2. **Define notification message types** (packages/shared/src/types/events.ts:45)
   - Create `NotificationEvent` interface with type, priority, payload
   - Add to existing EventType enum for type safety
   - Include timestamp and unique ID generation

3. **Build WebSocket subscription handler** (packages/web/src/hooks/use-notification-stream.ts)
   - Subscribe to user-specific notification channel
   - Handle reconnection with missed notification catch-up
   - Implement client-side deduplication by event ID

4. **Create notification center component** (packages/web/src/components/ui/notification-center.tsx)
   - Dropdown panel triggered by bell icon in header
   - Virtual scrolling for large notification lists
   - Mark-as-read on hover with debounce

5. **Add preference management** (packages/api/src/services/user-preferences.ts:78)
   - Store notification settings per category
   - Apply filters at event emission point
   - Cache preferences for performance

6. **Implement batching logic** (packages/api/src/services/notification-batcher.ts)
   - Collect events in 100ms windows
   - Group by recipient and notification type
   - Send as single WebSocket message per batch
```
</example>

<instructions>
Describe the implementation steps in concrete but flexible terms.

### Requirements
1. Number each major step sequentially
2. Include verified file paths where changes will occur. For each value that crosses a boundary in a step — a prop passed to a component, a parameter added to a function, an event emitted, a network call made — verify both ends: identify what produces the value and what consumes it. A step that adds a producer without a named consumer, or names a consumer without a named source, is incomplete.
3. Add line numbers when referencing existing code (e.g., `:78`)
4. Describe WHAT to do, not HOW to implement it
5. Keep each step focused on a single concern

### File Reference Guidelines
- Skip line numbers for new files
- Include them when referencing specific existing code; use inline markdown links over bare paths — soft links for prose (`the [notification store](./packages/web/src/stores/notification-store.ts) holds unread counts`) and precise anchors for step references (`[packages/api/src/services/user.ts L78](./packages/api/src/services/user.ts#L78)` or a range `[packages/api/src/services/user.ts L78–L95](./packages/api/src/services/user.ts#L78-L95)`)
- Use "around line X" if the exact line might shift

### Required for async operations and user-initiated flows
For each step that involves a network call, async operation, or user input (e.g., a picker, dialog, or confirmation), state what happens on failure or cancellation: propagate the error, show user feedback, or no-op with rationale. "The error propagates" is a valid and complete answer. Omitting it is not.

### Test specifications
When describing test cases, specify the observable outcome to assert — state reached, value returned, event emitted, record persisted — not the implementation mechanism invoked. A test that asserts "method X was called" is a contract with an implementation detail; a test that asserts "system reached state Y" is a contract with behavior. Spy-based assertions are appropriate only when the side effect being tested is the call itself (e.g., a notification sent to an external service with no observable local state change).

### Avoid
- Implementation details or algorithms
- Complete function signatures
- UI layout specifics
- Error handling implementation details (the catch block code itself)
</instructions>

### Code Example Guidelines

Include code examples that **clarify complex structures** without dictating implementation:

<example>
```typescript
// Example: Notification data structure (clarifies format)
interface Notification {
  id: string;
  type: 'comment' | 'mention' | 'system';
  priority: 1 | 2 | 3;  // 1 = high, 3 = low
  timestamp: number;
  read: boolean;
  data: Record<string, unknown>;
}

// Example: WebSocket event format (defines contract)
type NotificationBatch = {
  type: 'notification.batch';
  notifications: Notification[];
  missedCount?: number;  // For reconnection scenarios
};
```
</example>

<instructions>
Include code examples ONLY when they clarify contracts or complex data structures.

Good code examples show:
1. Type definitions and interfaces for data structures
2. API contracts between systems
3. Expected data transformations (input -> output format)
4. Integration points with existing code (with file references)
5. Configuration shapes or option objects

Never include:
1. Full function implementations
2. Step-by-step algorithms
3. UI component implementations
4. Error handling code
5. Business logic details

Keep examples minimal - just enough to clarify without constraining implementation choices.
</instructions>

---

### Dependency Analysis

<example>
```markdown
## Dependency Analysis

### High-Impact Files
- packages/shared/src/types/events.ts (743 imports) - Core event types used throughout system
- packages/web/src/hooks/use-websocket.ts (521 imports) - WebSocket connection hook all real-time features use
- packages/api/src/middleware/auth.ts (234 imports) - Auth required for notification filtering

### Key Integration Points
- packages/web/src/components/layout/header.tsx - Where notification bell icon mounts
- packages/api/src/services/event-emitter.ts - Central event dispatch for notifications
- packages/web/src/stores/index.ts - Store registry for new notification store

### External Dependencies
- @supabase/ssr: ^0.0.10 (authentication)
- zod: ^3.22.0 (validation, already in package.json)
```
</example>

<instructions>
Identify files that are critical dependencies or integration points for your implementation.

### Structure Requirements
- **High-Impact Files**: List files with significant import counts that you'll modify
- **Key Integration Points**: Files where your new code connects to existing systems. When adding to or removing from a discriminated union, enum, or closed variant set: also enumerate all files that exhaustively handle the full set — exhaustive switch/match statements, per-variant test coverage, serialization mappings. These files break at compile time or test time when the variant set changes, regardless of whether they directly import the modified type.
- **External Dependencies**: Libraries needed (note if already in package.json)

Include actual import counts in parentheses (e.g., "auth.ts (234 imports)") to indicate risk level.
List files where your new code connects to existing systems with brief descriptions.
</instructions>

---

### Validation Commands

<example>
```markdown
## Validation Commands
- Type check: `cd packages/web && yarn typecheck`
- Test: `cd packages/web && yarn test`
- Lint: `cd packages/web && yarn lint`
- E2E: `cd packages/web && yarn test:e2e`
```
</example>

<instructions>
**MANDATORY SECTION**: Every plan MUST include validation commands.

Provide ALL quality validation commands that must pass for implementation to be considered complete.

**Minimum Required Commands** (must include at minimum):
1. Type checking (e.g., `yarn typecheck`, `tsc --noEmit`)
2. Unit/integration tests (e.g., `yarn test`)
3. Linting (e.g., `yarn lint`, `eslint`)

**Additional Validation Commands** (include when applicable):
- E2E tests (e.g., `yarn test:e2e`)
- Integration tests (e.g., `yarn test:integration`)
- Contract tests (e.g., `yarn test:contract`)
- Any other commands that verify correctness

**Process**:
1. Identify affected packages from your Technical Approach
2. Check each package's package.json for validation scripts
3. Format as self-contained commands that `cd` into the affected package before invoking the script, e.g. `cd packages/[package] && yarn typecheck`. Validation scripts are package-scoped and will not resolve if run directly from the workspace root.
4. Include ALL validation commands - never skip tests

**For multiple packages**:
```markdown
## Validation Commands
### packages/[package-1]
- Type check: `cd packages/[package-1] && yarn typecheck`
- Test: `cd packages/[package-1] && yarn test`
- Lint: `cd packages/[package-1] && yarn lint`

### packages/[package-2]
- Type check: `cd packages/[package-2] && yarn typecheck`
- Test: `cd packages/[package-2] && yarn test:e2e`
- Lint: `cd packages/[package-2] && yarn lint`
```

**Note**: These commands will be executed to verify implementation quality. ALL commands must pass with zero errors.
</instructions>

---

### Other Package Commands (Optional)

<example>
```markdown
## Other Package Commands
- Build: `cd packages/web && yarn build`
- Run dev server: `cd packages/web && yarn dev`
- Add dependency: `cd packages/api && yarn add express@4.18.0`
- Run simulation: `cd packages/simulation && yarn tsx src/run.ts`
```
</example>

<instructions>
**OPTIONAL SECTION**: Include operational commands that are NOT validation but may be useful for development or deployment.

Include commands for:
- Building artifacts (e.g., `yarn build`)
- Running development servers (e.g., `yarn dev`)
- Adding dependencies (e.g., `yarn add package@version`)
- Running specific tools or scripts (e.g., `yarn tsx src/script.ts`)
- Database migrations (e.g., `yarn migrate`)
- Deployment (e.g., `yarn deploy`)

**Do NOT include** in this section:
- Type checking, testing, or linting (those go in Validation Commands)
- Any command that verifies code correctness

Skip this section entirely if there are no operational commands to document.
</instructions>

---

### Risks & Mitigations

<example>
```markdown
## Risks & Mitigations
- **Risk**: Browser notification API permissions vary by browser
  **Mitigation**: Graceful degradation to in-app only when API unavailable

- **Risk**: High-frequency events could overwhelm clients
  **Mitigation**: Server-side rate limiting at 100 events/second per user

- **Risk**: Notifications lost during WebSocket reconnection
  **Mitigation**: Include last-received timestamp in reconnect, server replays missed

- **Risk**: Storage quota exceeded with too many notifications
  **Mitigation**: Implement rolling window keeping only last 1000 notifications
```
</example>

<instructions>
Identify technical risks that could cause the implementation to fail or perform poorly.

Focus on:
1. Technical risks only (not project management risks)
2. Specific, discovered concerns (not generic worries)
3. Actionable mitigations (not "be careful")

Format each risk as:
- **Risk**: [Specific technical concern]
  **Mitigation**: [Concrete solution or approach]

Include 3-5 most significant risks. More than 5 suggests over-analysis.
</instructions>

---

### Implementation References (Optional)

<example>
```markdown
## Implementation References
- Event patterns: packages/api/src/services/analytics-events.ts:123 - Similar event batching
- WebSocket setup: packages/web/src/hooks/use-chat.ts:45 - Real-time subscription pattern
- Dropdown UI: packages/web/src/components/ui/dropdown-menu.tsx:12 - Reusable dropdown
- Virtual scroll: packages/web/src/components/tables/data-table.tsx:234 - Virtual rendering
- Storage: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas
```
</example>

<instructions>
Include this section ONLY when you have specific, helpful references.

Good references include:
1. Similar patterns in the codebase (with file:line references)
2. Reusable components or utilities
3. External documentation for complex APIs
4. Example implementations to follow

Guidelines:
- Use inline markdown links — soft links for prose context, precise anchors for specific locations (`[packages/api/src/services/analytics-events.ts L123](./packages/api/src/services/analytics-events.ts#L123)`)
- Explain briefly why each reference is relevant
- Limit to 3-5 most helpful references
- Verify all file paths before including them

Skip this section if you don't have genuinely useful references.
</instructions>

---

### Open Questions (Optional)

<example>
```markdown
## Open Questions

- [ ] Payment provider selection — decision needed by Dec 1
- [ ] Redis cluster sizing — needs load testing before finalization
- [x] ~~Authentication approach~~ — resolved: using existing OAuth (see comments)

**Assumptions** (believed true, unvalidated):
- Users have reliable internet connection
- Peak load won't exceed 10x current baseline
```
</example>

<instructions>
Document uncertainties explicitly:
- Use checkboxes for trackable decisions ([ ] open, [x] resolved)
- Include deadlines or dependencies where applicable
- List assumptions separately — these are risks if wrong
- Update as questions resolve in comment thread
- After the Open Questions section, include a `---` horizontal rule to visually signal to the user that their input is required. This separator is always required in plans submitted for user approval.
</instructions>

</annotated-plan-example>

---

<key-principles>
1. **Precision**: Use verified file paths with line numbers, linked inline — soft links for prose references and precise anchors for step locations (`[src/services/user.ts L78](./src/services/user.ts#L78)`)
2. **YAGNI**: Only features solving the immediate problem
3. **Integration Over Innovation**: Reuse existing patterns
4. **Examples Clarify, Not Constrain**: Show data shapes, not implementations
5. **Test the Risks**: Focus on what could actually fail
6. **Scope Exclusions Prevent Creep**: Explicitly state what's NOT included

7. **Testability**: For each requirement, ask "How would we test this?"
   If no clear test exists, the requirement needs more specificity.

8. **Ubiquitous Language**: Use consistent terminology matching the codebase.
   If code says `ShoppingCart`, plan says "Shopping Cart" not "Basket."

9. **Evolution Readiness**: Structure plans for change — modular sections,
   explicit uncertainties.

10. **Decisions in Comments**: The card comment thread preserves decision history.
    Plans reference outcomes; rationale lives in separate meta-analysis comments.

11. **Standalone Plans**: Each plan comment must be self-contained and readable
    without context from other comments. No revision notes or conversational preamble.

12. **Commit Message Heritage**: The Problem Statement you write today becomes the "before"
    in tomorrow's commit message. Your Risks section becomes foreshadowing in the narrative.
    Two years from now, someone will quote these words in a postmortem or incident report.
    Write so they'll understand why this work existed—and write clearly enough that they
    won't need to quote the whole paragraph.

The best plan answers "what" and "where" while leaving "how" to the implementer.
</key-principles>

<quality-assessment>
### Quick Assessment (use before loading full methodologies)

For lightweight issues, apply these inline checks without loading reference files:

1. **Vagueness check**: Flag terms "fast", "user-friendly", "intuitive", "scalable", "reliable" without definitions
2. **Testability check**: Ask "How would we test this?" — if no clear answer, requirement needs work
3. **Scope check**: Sparse Exclude section (< 3 items) suggests insufficient boundary thinking
4. **Rationale check**: Technology choices without "because" or "selected over" phrases lack justification

Load full reference documents only when remediation guidance is needed or the issue is complex.

### Full Methodologies

Select and load reference documents based on the quality issues encountered during assessment:

- **If requirements contain subjective terms** (e.g., "fast", "user-friendly", "scalable" without definitions): Read `references/vague-language-detection.md`. Provides systematic patterns for identifying ambiguous language and transforming it into specific, measurable criteria. Use when a clear test case cannot be envisioned for a requirement or when numeric thresholds are missing from performance claims.
- **If plan sections contradict each other or use inconsistent terminology**: Read `references/coherence-checking.md`. Provides verification processes for cross-referencing values, terms, and scope items across all plan sections. Use when performance targets differ between sections, terminology is inconsistent, or scope boundaries conflict with technical approach.
- **If technical decisions lack justification or trade-offs are undocumented**: Read `references/rationale-capture.md`. Provides patterns for capturing technology selection reasoning, constraint origins, and exclusion rationale. Use when future maintainers would ask "why was this done?" or when scope exclusions lack explanation.
- **If the Exclude section is sparse or features use speculative language** (e.g., "might need", "for future use"): Read `references/scope-management.md`. Provides YAGNI assessment framework and scope defense protocols for maintaining clear project boundaries. Use when features aren't tied to the problem statement or when scope creep indicators appear in Technical Approach.
- **If the answer to "How would we test this?" is unclear for a requirement**: Read `references/testability-assessment.md`. Provides criteria for verifying requirements are observable, measurable, and deterministic with clear pass/fail conditions. Use when goals use subjective success criteria or acceptance criteria are abstract.
- **If non-functional requirements are missing or assumed but not documented**: Read `references/nfr-completeness.md`. Provides checklists for performance, reliability, security, and scalability coverage with assessment questions for each category. Use when there are no latency targets for user-facing operations or when scalability expectations are based on hope rather than evidence.
- **If open questions are hidden in prose or sections aren't modular**: Read `references/document-evolution.md`. Provides mechanisms for decision tracking via comments, open questions management, and modular section structure that supports iterative refinement. Use when assessing whether the plan can evolve healthily as implementation progresses.

</quality-assessment>
