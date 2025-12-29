---
name: plan
description: Implementation plan format with required sections.
---

# Implementation Plan Format

This skill defines how to structure implementation plans posted as issue comments. Plans require user approval before implementation begins.

## Complexity Tiers

Select sections based on issue scope:

### Tier 1: Simple Changes
*1-3 files, clear requirements*

Required sections:
- Problem Statement
- Goals & Objectives
- Technical Approach
- Validation Commands

### Tier 2: Standard Features
*4-10 files, moderate complexity*

Add to Tier 1:
- Scope (Include/Exclude)
- Dependency Analysis
- Risks & Mitigations

### Tier 3: Complex Systems
*10+ files, architectural changes, unknowns*

Add to Tier 2:
- Framework & Technology Stack
- Technical Spike Results
- Implementation References
- Open Questions

---

## Plan Revisions

When the user requests changes to a plan:

1. Post a meta-analysis comment explaining the changes:
   ```markdown
   ## Plan Revision Notes

   Based on your feedback, I've updated the plan:
   - Added batching logic for high-frequency events
   - Removed preference caching (will use existing cache layer)
   - Narrowed scope to exclude mobile push notifications

   Revised plan follows in the next comment.
   ```

2. Post the revised plan as a separate, standalone comment
3. The plan comment contains only the plan — no revision notes or diff summaries

---

## Posting Plans

Plans are posted as standalone comments via `POST /issues/{issueId}/comments`:

```typescript
{
  "body": "[plan content]",
  "author": "agent",
  "codeReferences": [
    // Required: Include ALL files mentioned in Technical Approach
    { "uri": "src/services/auth.ts", "range": { "startLine": 45, "endLine": 78 } }
  ]
}
```

### Code References
Include code references for files mentioned in:
- Technical Approach steps
- Dependency Analysis
- Implementation References

### Standalone Requirement
The plan comment must be self-contained and readable without context from other comments. Do not include:
- References to "the previous version"
- Diff summaries or change notes
- Conversational preamble ("Based on your feedback...")

If revising a plan, post meta-analysis as a separate comment before the plan.

---

<annotated-plan-example>

## Header Format

<example>
```markdown
## Implementation Plan

The application currently lacks real-time notification capabilities, requiring users to manually refresh pages to see updates. This leads to delayed awareness of important events, reduced user engagement, and a subpar experience compared to modern web applications.
```
</example>

<instructions>
Plans inherit their title from the parent issue. Start every plan with `## Implementation Plan` followed directly by the problem statement (2-4 sentences).

The problem statement must:
1. Explain the current state and its limitations
2. Describe the negative impact on users or the system
3. Make clear why this needs to be solved now
4. Avoid proposing solutions (save for Technical Approach)
</instructions>

---

## Goals & Objectives

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

## Scope

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

### Exclude (CRITICAL - prevents scope creep)
- Explicitly list what will NOT be built
- Features deferred to future versions
- Related functionality that's out of scope
- Platforms or use cases not being addressed

The Exclude section saves more time than any other part by preventing scope creep.
</instructions>

---

## Framework & Technology Stack

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

## Technical Spike Results (When Needed)

<instructions>
Include this section when you have critical technical unknowns requiring empirical investigation. This includes strategic spikes (comparing alternatives) or tactical spikes (validating chosen approaches). Omit this section if all technical assumptions are validated by existing code or documentation.

### When to Conduct Technical Spikes

**Strategic Spikes** (Comparing Alternatives):
- Technology selection between multiple viable approaches
- Architecture pattern evaluation
- Unfamiliar technology assessment

**Tactical Spikes** (Validating Chosen Approach):
- Version compatibility verification
- API/export verification
- Framework behavior validation
- Integration validation
- Performance feasibility

### When to Skip Spikes
- The approach/technology has not been chosen yet (research codebase first)
- Well-documented framework features with clear examples
- Internal code patterns already established
- Standard operations with known patterns

### Spike Workflow in Issue Context

Based on worktree availability:
- **Worktree exists for the issue**:
  1. Create spike code in `.spikes/[ISSUE_ID]/[spike-name]/` within the worktree
  2. Run experiments and document results
  3. Delete the spike directory before committing implementation
  4. Reference evidence and conclusions in the plan — artifacts don't persist
- **No worktree exists (plan-required issues)**:
  1. Conduct lightweight investigation using Read/Grep tools
  2. Document findings without creating prototype code
  3. Note that full spike validation will occur during implementation if needed
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
- **Artifacts**: `.spikes/[ISSUE_ID]/realtime-comparison/` (cleaned up before commit)
- **Impact**: Selected Socket.io as Technical Approach; enables bidirectional real-time features with horizontal scaling via Redis adapter

### Socket.io Redis Adapter Compatibility

**Type:** Tactical Spike

- **Question**: Does Socket.io v4.6.1 support Redis adapter for cross-instance message broadcasting?
- **Approach Tested**: Created minimal Socket.io server with @socket.io/redis-adapter, tested multi-instance communication
- **Result**: Confirmed v4.6.1 supports Redis adapter with connection state sharing
- **Evidence**: Successfully broadcast messages across 3 server instances, verified in spike test
- **Artifacts**: `.spikes/[ISSUE_ID]/socketio-redis-test/` (cleaned up before commit)
- **Impact**: Can proceed with horizontal scaling approach; no single-server bottleneck
```
</example>

---

## Technical Approach

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
2. Include verified file paths where changes will occur
3. Add line numbers when referencing existing code (e.g., `:78`)
4. Describe WHAT to do, not HOW to implement it
5. Keep each step focused on a single concern

### Line Number Guidelines
- Skip line numbers for new files
- Include them when referencing specific existing code
- Use "around line X" if the exact line might shift

### Avoid
- Implementation details or algorithms
- Complete function signatures
- UI layout specifics
- Error handling details (unless critical to approach)
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

## Dependency Analysis

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
- **Key Integration Points**: Files where your new code connects to existing systems
- **External Dependencies**: Libraries needed (note if already in package.json)

Include actual import counts in parentheses (e.g., "auth.ts (234 imports)") to indicate risk level.
List files where your new code connects to existing systems with brief descriptions.
</instructions>

---

## Validation Commands

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
3. Format as executable commands from workspace root
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

## Other Package Commands (Optional)

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

## Risks & Mitigations

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

Common risk categories:
- Browser compatibility differences
- Performance degradation at scale
- Network reliability issues
- State synchronization problems
- Resource limitations (memory, storage)
- Security or permission constraints

Format each risk as:
- **Risk**: [Specific technical concern]
  **Mitigation**: [Concrete solution or approach]

Include 3-5 most significant risks. More than 5 suggests over-analysis.
</instructions>

---

## Implementation References (Optional)

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
- Include line numbers for precision
- Explain briefly why each reference is relevant
- Limit to 3-5 most helpful references
- Verify all file paths before including them

Skip this section if you don't have genuinely useful references.
</instructions>

---

## Open Questions (Optional)

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
</instructions>

<instructions>
This signals the user that action is required. The horizontal rule visually separates the request from plan content. This section is always required.
</instructions>

</annotated-plan-example>

---

<complete-tier2-example>

## Complete Tier 2 Plan Example

This example shows a complete, standalone plan comment for a Tier 2 feature:

```markdown
## Implementation Plan

The application currently lacks real-time notification capabilities, requiring users to manually refresh pages to see updates. This leads to delayed awareness of important events and reduced user engagement compared to modern web applications.

## Goals & Objectives
- [ ] Create notification queue with priority-based ordering
- [ ] Implement real-time delivery via WebSocket connections
- [ ] Build notification center UI with read/unread states
- [ ] Add user preference controls for notification types

## Scope

### Include
- In-app notification delivery and display
- Real-time updates via WebSocket connections
- Notification center dropdown component
- User preference storage and enforcement
- Read/unread state management

### Exclude
- Email notification delivery
- Push notifications to mobile devices
- Notification scheduling/delayed delivery
- Rich media attachments

## Technical Approach
1. **Create notification store** (packages/web/src/stores/notification-store.ts)
   - Add notifications array with priority sorting
   - Implement unreadCount computed property

2. **Define message types** (packages/shared/src/types/events.ts:45)
   - Create NotificationEvent interface
   - Add to existing EventType enum

3. **Build WebSocket handler** (packages/web/src/hooks/use-notification-stream.ts)
   - Subscribe to user-specific channel
   - Handle reconnection with catch-up

4. **Create UI component** (packages/web/src/components/ui/notification-center.tsx)
   - Dropdown panel triggered by bell icon
   - Mark-as-read on hover with debounce

5. **Add preference management** (packages/api/src/services/user-preferences.ts:78)
   - Store settings per notification category
   - Apply filters at emission point

## Dependency Analysis

### High-Impact Files
- packages/shared/src/types/events.ts (743 imports) - Core event types
- packages/web/src/hooks/use-websocket.ts (521 imports) - WebSocket hook

### Key Integration Points
- packages/web/src/components/layout/header.tsx - Bell icon mount point
- packages/api/src/services/event-emitter.ts - Event dispatch

## Validation Commands
- Type check: `cd packages/web && yarn typecheck`
- Test: `cd packages/web && yarn test`
- Lint: `cd packages/web && yarn lint`

## Risks & Mitigations
- **Risk**: High-frequency events overwhelm clients
  **Mitigation**: Server-side rate limiting at 100 events/second

- **Risk**: Notifications lost during reconnection
  **Mitigation**: Include last-received timestamp, server replays missed

- **Risk**: Storage quota exceeded
  **Mitigation**: Rolling window keeping last 1000 notifications

```

</complete-tier2-example>

---

<common-mistakes>
### 1. Vague Goals
Bad: "Improve notification system performance"
Good: "Process 100+ notifications/second without UI lag"

### 2. Over-Detailed Technical Approach
Bad: "Create processNotification() function that takes a Notification object..."
Good: "Build notification processing pipeline with priority ordering"

### 3. Missing Scope Exclusions
Bad: Only listing what's included
Good: Both Include AND Exclude sections

### 4. Generic Risks
Bad: "Risk: Performance issues. Mitigation: Optimize the code"
Good: "Risk: High-frequency events could overwhelm clients. Mitigation: Server-side rate limiting at 100 events/second"

### 5. Guessed File Paths
Bad: "Update notification service (probably in src/services/notifications.ts)"
Good: "Update notification dispatcher (packages/api/src/services/event-emitter.ts:234)"

### 6. Missing Version Information
Bad: "React: latest" or "Node.js: current"
Good: "React: 18.2.0" or "React: react@18.2.0" (both acceptable)

### 7. Including Meta-Commentary
Bad: "Based on your feedback, I've updated the approach to..."
Good: Post meta-analysis as a separate comment; keep plan standalone
</common-mistakes>

<anti-patterns>
### The Wishlist Plan
**Symptoms**: 20+ goals, no clear priority, "wouldn't it be nice if..."
**Fix**: Ruthlessly cut to 3-7 goals that directly solve the stated problem

### The Implementation Manual
**Symptoms**: Step-by-step algorithms, complete function signatures, UI specs
**Fix**: Stay at "what to build" level, leave "how" to implementation

### The Eternal Draft
**Symptoms**: TBD throughout, vague language, "we'll figure it out"
**Fix**: Resolve unknowns via spikes before planning, or mark as explicit blockers

### The Kitchen Sink
**Symptoms**: Scope Include is long, Exclude is empty or minimal
**Fix**: Exclude section should be longer — explicitly reject adjacent features

### The Copy-Paste Template
**Symptoms**: Generic risks, placeholder text, inapplicable sections
**Fix**: Every section must contain project-specific content or be omitted

### The Stale Artifact
**Symptoms**: Plan doesn't match current implementation or decisions
**Fix**: Post revised plan when scope changes

### The Oracle
**Symptoms**: Requirements without rationale, "because I said so" decisions, missing trade-off documentation
**Fix**: Add rationale inline or in dedicated section, document alternatives considered

### The Chatty Plan
**Symptoms**: "As we discussed...", "Based on your feedback...", "In the previous version..."
**Fix**: Keep plan standalone; post meta-analysis as separate comment
</anti-patterns>

<key-principles>
1. **Precision**: Use verified file paths with line numbers
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

10. **Decisions in Comments**: The issue comment thread preserves decision history.
    Plans reference outcomes; rationale lives in separate meta-analysis comments.

11. **Standalone Plans**: Each plan comment must be self-contained and readable
    without context from other comments. No revision notes or conversational preamble.

12. **No Backward Compatibility Shims**: Delete unused code completely.
    Don't rename to `_unused`, re-export for compatibility, or add "removed" comments.
    If something is no longer needed, remove it.

The best plan answers "what" and "where" while leaving "how" to the implementer.
</key-principles>

<quality-assessment>
### Quick Assessment (use before loading full methodologies)

For lightweight issues, apply these inline checks without loading methodology files:

1. **Vagueness check**: Flag terms "fast", "user-friendly", "intuitive", "scalable", "reliable" without definitions
2. **Testability check**: Ask "How would we test this?" — if no clear answer, requirement needs work
3. **Scope check**: Sparse Exclude section (< 3 items) suggests insufficient boundary thinking
4. **Rationale check**: Technology choices without "because" or "selected over" phrases lack justification

Load full methodology only when remediation guidance is needed or the issue is complex.

### Full Methodologies

Select and load methodology documents based on the quality issues you encounter during assessment:

- **If requirements contain subjective terms** (e.g., "fast", "user-friendly", "scalable" without definitions): Read `methodology/vague-language-detection.md`. Provides systematic patterns for identifying ambiguous language and transforming it into specific, measurable criteria. Use when you cannot envision a clear test case for a requirement or when numeric thresholds are missing from performance claims.
- **If plan sections contradict each other or use inconsistent terminology**: Read `methodology/coherence-checking.md`. Provides verification processes for cross-referencing values, terms, and scope items across all plan sections. Use when performance targets differ between sections, terminology is inconsistent, or scope boundaries conflict with technical approach.
- **If technical decisions lack justification or trade-offs are undocumented**: Read `methodology/rationale-capture.md`. Provides patterns for capturing technology selection reasoning, constraint origins, and exclusion rationale. Use when future maintainers would ask "why was this done?" or when scope exclusions lack explanation.
- **If the Exclude section is sparse or features use speculative language** (e.g., "might need", "for future use"): Read `methodology/scope-management.md`. Provides YAGNI assessment framework and scope defense protocols for maintaining clear project boundaries. Use when features aren't tied to the problem statement or when scope creep indicators appear in Technical Approach.
- **If you cannot answer "How would we test this?" for a requirement**: Read `methodology/testability-assessment.md`. Provides criteria for verifying requirements are observable, measurable, and deterministic with clear pass/fail conditions. Use when goals use subjective success criteria or acceptance criteria are abstract.
- **If non-functional requirements are missing or assumed but not documented**: Read `methodology/nfr-completeness.md`. Provides checklists for performance, reliability, security, and scalability coverage with assessment questions for each category. Use when there are no latency targets for user-facing operations or when scalability expectations are based on hope rather than evidence.
- **If open questions are hidden in prose or sections aren't modular**: Read `methodology/document-evolution.md`. Provides mechanisms for decision tracking via comments, open questions management, and modular section structure that supports iterative refinement. Use when assessing whether the plan can evolve healthily as implementation progresses.

</quality-assessment>

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
