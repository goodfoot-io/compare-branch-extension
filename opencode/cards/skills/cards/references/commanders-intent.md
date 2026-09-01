<how-to-write-a-commanders-intent>

The opening of `CARD.md` — no heading, no label — is the commander's intent: a short prose picture of what "done" looks like. Every downstream section serves it; anything that does not moves to `notes/`, or the intent is wrong. When implementation hits a wall, the intent tells the implementer where to go, not what to escape.

## First Principles

1. **Destination, not problem.** Open with what the world looks like the day the work ships, not with what is broken. The first framing survives plan changes; the second does not.

2. **User-observable, present tense.** Describe what a user, operator, or reviewer will see — not what the system does internally. A destination that cannot be seen or used is an implementation detail that has crept into the opening.

3. **Constraints, not mechanisms.** Invariants that must hold regardless of approach — latency, compatibility, data shape, a behavior users rely on — belong in the intent. The mechanism chosen to reach the destination does not; a different implementation reaching the same picture still counts as done.

4. **Non-goals are load-bearing.** Name the near-misses: outcomes that look like arrival but are not, and adjacent work that would expand the card past its shape.

5. **Two echelons down.** Someone two steps removed from the author must be able to act on the opening without clarification. Jargon, cross-card context, and unstated assumptions belong in a downstream section.

6. **Coherence test.** Pose a plausible scope question the card does not explicitly answer. If the intent alone cannot resolve it, refine the intent — not the downstream sections.

## Style

- Present tense, describing the world after "done" as if it already exists.
- Concrete nouns over abstractions — "the panel shows the stream" over "improved stream visibility."
- User or operator as the subject where possible.
- Prose, not bullets or tables.
- No fragment links in the opening; link from downstream sections instead.
- One tight paragraph for a small card; up to three when destination, constraints, and non-goals each need their own breath. Stop when removing another sentence would lose something load-bearing.

These tests apply to every question asked to shape the intent, not just the opening itself. Vocabulary from this guide and from the writing guides does not belong in exchanges with the user.

</how-to-write-a-commanders-intent>
