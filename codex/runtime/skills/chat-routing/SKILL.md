---
name: chat-routing
description: Route conversational intent to the appropriate skill.
---
<!-- @cards.management/agent-skills source: public/skills-src/runtime/chat-routing/SKILL.md.eta sha256:d9c8593064c739f17356460d830a553fe52927ff65fe198010e2723a345fa8c1 -->

<routing-constraints>
Route only — evaluate, select, and load. The loaded reference does the work.
</routing-constraints>

<quiet>
Routing runs without user interaction. Messages describing state and routing decisions are not required.
</quiet>

<routing-instructions>

## 1. Evaluate Routing Signals

Read the user's conversational message(s) to classify intent.

| Signal | Derivation |
|--------|------------|
| REQUESTING_INTERVIEW | User wants to elaborate requirements, provide context, or be asked what they need ("let me describe what I need", "can we flesh this out", "what do you need from me?") |
| REQUESTING_DEVELOPMENT | User message is directive toward action on the card ("implement", "start", "fix", "plan this", "go ahead", "build it") |

## 2. Route

Select the **first** matching condition:

- **1. REQUESTING_INTERVIEW**: `$runtime:interview`
- **2. REQUESTING_DEVELOPMENT**: `$runtime:card`
- **3. Otherwise**: non-routed — agent handles directly

**Fallback**: When conditions conflict, default to non-routed. Do not force a structured flow the user did not request.

## 3. Load Routed Skill

For conditions 1 and 2, invoke the matched skill by mentioning it as `$[MATCHED_SKILL]` (for example, `$runtime:interview` or `$runtime:card`).

For condition 3, continue without loading a skill.

</routing-instructions>

**IMPORTANT: Load skills based on the `<routing-instructions>` when you infer the user's intent from the conversation.**
