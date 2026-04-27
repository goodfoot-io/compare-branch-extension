<how-to-write-a-commanders-intent>

The opening of `CARD.md` — no heading, no label — is the commander's intent: a short prose picture of what "done" looks like. It is the first thing written and the thing every downstream section serves. When implementation hits a wall, the intent tells the implementer where to go; it does not tell them what to escape.

## First Principles

1. **Destination, not problem.** A card that opens with what is broken orients the reader toward fixing a deficiency; one that opens with what the world looks like the day the work ships orients them toward a goal they can reach in more than one way. The second framing survives plan changes. The first does not.

2. **User-observable, present tense.** Describe what a user, operator, or reviewer will see — not what the system does internally. If the destination cannot be seen or used, it is not the intent; it is an implementation detail that has crept into the opening.

3. **Constraints, not mechanisms.** Invariants that must hold regardless of approach — latency, compatibility, data shape, a behavior users rely on — belong in the intent. The mechanism chosen to reach the destination does not. If a different implementation would reach the same picture, it should still count as done; when the chosen mechanism appears in the opening, the intent has collapsed into the plan and will drag the card with it.

4. **Non-goals are load-bearing.** Name the near-misses: outcomes that look like arrival but are not, and adjacent work that would expand the card past its shape. A reader who can recite the destination without the non-goals will drift.

5. **Two echelons down.** Someone two steps removed from the card's author should be able to read the opening and act on it without clarification. Jargon, cross-card context, or unstated assumptions that fail this test belong in a downstream section, not in the intent.

6. **Coherence test.** Pose a plausible scope question the card does not explicitly answer. If the intent alone cannot resolve it, refine the intent — not the downstream sections. Weak intent produces plans that require constant clarification; strong intent produces plans that adapt without losing direction.

## Style

- Present tense, describing the world after "done" as if it already exists.
- Concrete nouns over abstractions — "the panel shows the stream" over "improved stream visibility."
- User or operator as the subject where possible.
- Prose, not bullets or tables — the reader is building a picture, not running a checklist.
- No fragment links in the opening; link from downstream sections instead.
- Length follows substance. One tight paragraph for a small card; up to three when destination, constraints, and non-goals each need their own breath. Stop when removing another sentence would lose something load-bearing.

These tests apply to any text the user reads about the intent — the opening paragraph itself, and every question asked to shape it. Vocabulary from this guide does not belong in questions posed to the user.

</how-to-write-a-commanders-intent>
