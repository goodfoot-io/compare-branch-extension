---
name: chat-routing
description: Evaluate the user's conversational intent and load the appropriate skill or agent.
---

<routing-constraints>
The routing phase evaluates and selects — it does NOT implement, interview, or modify card content. After routing, the matched skill is loaded and its instructions take over.

| Routing phase | Loaded skill handles |
|------------------------|--------------------------------|
| Evaluating routing conditions | Conducting the interview |
| Selecting the appropriate skill | Development and planning |
| Loading the matched skill | Answering questions and making focused changes |

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

- **1. REQUESTING_INTERVIEW**: `runtime:interview-routing`
- **2. REQUESTING_DEVELOPMENT**: `runtime:card-routing`
- **3. Otherwise**: non-routed — agent handles directly

**Fallback**: When conditions conflict, default to non-routed. Do not force a structured flow the user did not request.

## 3. Load Routed Skill

For conditions 1 and 2, load the matched skill using the Skill tool:

```xml
<invoke name="Skill">
<parameter name="skill">[MATCHED_SKILL]</parameter>
</invoke>
```

For condition 3, continue without loading a skill.

</routing-instructions>

**IMPORTANT: Load skills based on the `<routing-instructions>` when you infer the user's intent from the conversation.**
