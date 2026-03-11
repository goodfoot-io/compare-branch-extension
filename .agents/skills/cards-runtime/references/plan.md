This defines how to structure implementation plans stored as PLAN.md in card repositories. Plans require user approval before implementation begins.

## Complexity Tiers

Select sections based on the *type* of change, not the number of files touched:

### Tier 1: Surgical Changes
*Single known fix — no new wiring between components, no new architectural patterns, clear scope*

Required sections:
- Problem Statement
- Goals & Objectives
- Scope (Include/Exclude)
- Technical Approach
- Risks & Mitigations
- Validation Commands

### Tier 2: Features and Modifications
*New behavior, existing flow modified, any new wiring between components, or multiple integration points*

Add to Tier 1:
- Dependency Analysis

### Tier 3: Architectural Changes
*New systems, new patterns, significant unknowns, or cross-cutting changes*

Add to Tier 2:
- Framework & Technology Stack
- Technical Spike Results
- Implementation References
- Open Questions

When in doubt, use the higher tier.

---

<quick-reference>
## Quick Reference

### Always Required (All Tiers)
- `## Implementation Plan` header
- Problem Statement (2-4 sentences)
- Goals & Objectives (3-7 checkbox items)
- Scope (Include AND Exclude)
- Technical Approach (numbered steps with file paths)
- Risks & Mitigations (3-5 items)
- Validation Commands (typecheck, test, lint minimum)

### Include for Tier 2+
- Dependency Analysis (high-impact files + integration points)

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

<key-principles>
1. **Precision**: Use verified file paths with line numbers, linked inline — soft links for prose references and precise anchors for step locations (`[src/services/user.ts L78](./src/services/user.ts#L78)`)
2. **YAGNI**: Only features solving the immediate problem
3. **Integration Over Innovation**: Reuse existing patterns
4. **Connected Data Flow**: Every value that crosses a boundary — prop, parameter, event, field — must name its producer and its consumer. A step that adds a writer without a reader, or a reader without a writer, is incomplete.
5. **Test the Risks**: Focus on what could actually fail
6. **Scope Exclusions Prevent Creep**: Explicitly state what's NOT included

7. **Testability**: For each requirement, ask "How would we test this?"
   If no clear test exists, the requirement needs more specificity.

8. **Ubiquitous Language**: Use consistent terminology matching the codebase.
   If code says `ShoppingCart`, plan says "Shopping Cart" not "Basket."

9. **Decisions in Comments**: The card comment thread preserves decision history.
   Plans reference outcomes; rationale lives in separate meta-analysis comments.

10. **Standalone Plans**: Each plan comment must be self-contained and readable
    without context from other comments. No revision notes or conversational preamble.

The best plan answers "what" and "where" while leaving "how" to the implementer.
</key-principles>

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
1. Number steps so each step's dependencies are satisfied by earlier steps. When implementation order must differ, annotate the dependency (e.g., "step 4 before step 3 — type produced in 4 is consumed in 3").
2. Include verified file paths where changes will occur. For each value that crosses a boundary in a step — a prop passed to a component, a parameter added to a function, an event emitted, a network call made — name both the producer and consumer by file path. A step that adds a producer without a named consumer, or names a consumer without a named source, is incomplete.
3. Add line numbers when referencing existing code (e.g., `:78`)
4. Describe WHAT to do, not HOW to implement it
5. Keep each step focused on a single concern

### File Reference Guidelines
- Skip line numbers for new files
- Include them when referencing specific existing code; use inline markdown links over bare paths — soft links for prose (`the [notification store](./packages/web/src/stores/notification-store.ts) holds unread counts`) and precise anchors for step references (`[packages/api/src/services/user.ts L78](./packages/api/src/services/user.ts#L78)` or a range `[packages/api/src/services/user.ts L78–L95](./packages/api/src/services/user.ts#L78-L95)`)
- Use "around line X" if the exact line might shift

### Error handling
Errors propagate by default — steps need not state this. When a step deviates from propagation (catch blocks, fallback values, default returns), name the specific error types being suppressed, the conditions, and the rationale. Blanket suppression (`.catch(() => null)`, `catch {}`, `catch { return [] }`) is not a valid posture.

### Test specifications
When the plan changes behavior covered by existing tests, enumerate each affected test file with its disposition: delete (obsolete), rewrite (new behavior), or update (adjusted assertions). A plan that changes behavior without accounting for its existing test coverage produces avoidable failures during implementation.

When describing new test cases, specify the observable outcome to assert — state reached, value returned, event emitted, record persisted — not the implementation mechanism invoked.

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
When the plan modifies a type, interface, enum, or function signature, search the workspace for files that consume it and include each with its disposition (update, delete, no change needed with reason). The unit of correctness is the full set of consumers, not a curated subset.

### Structure Requirements
- **High-Impact Files**: Files you'll modify, with import counts in parentheses to indicate risk level
- **Key Integration Points**: Files where your new code connects to existing systems. When adding to or removing from a discriminated union, enum, or closed variant set: also enumerate all files that exhaustively handle the full set — exhaustive switch/match statements, per-variant test coverage, serialization mappings. These files break at compile time or test time when the variant set changes, regardless of whether they directly import the modified type.
- **External Dependencies**: Libraries needed (note if already in package.json)
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

