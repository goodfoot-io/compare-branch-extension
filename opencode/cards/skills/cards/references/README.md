# Card-Type References

Single source of truth for card-type guidance. Two files per card type:
- `<type>.md` — **writing guide**: target CARD.md structure.
- `interview-<type>.md` — **pre-creation interview guide**: how to reach enough signal before creating the card.

Plus one shared reference used by every card type:
- `commanders-intent.md` — first-principles guide for the opening paragraph(s) of `CARD.md`. Every writing guide and interview guide references it; do not duplicate its guidance elsewhere.

Two non-type references loaded on demand from the skill body:
- `extension-cli.md` — `cards-extension` CLI for controlling the VS Code extension host.
- `launch-cards.md` — serial batch-launch procedure for a set of cards.

## Consumers

1. **Card creation** (`$cards` skill) — loads both the interview and writing guide for the matched card type. Interview runs first; the writing guide shapes CARD.md at `cards create` time.
2. **Post-creation interview** (`$interview` skill) — routes by card type, then loads `commanders-intent.md`, `<type>.md`, and its own `interview-<type>.md`.

## Symlinks

`public/codex/runtime/skills/interview/references/` symlinks the writing guides and `commanders-intent.md` back to this directory:

```
bug-report.md        -> ../../../../cards/skills/cards/references/bug-report.md
enhancement.md       -> ../../../../cards/skills/cards/references/enhancement.md
investigation.md     -> ../../../../cards/skills/cards/references/investigation.md
documentation.md     -> ../../../../cards/skills/cards/references/documentation.md
maintenance.md       -> ../../../../cards/skills/cards/references/maintenance.md
operations.md        -> ../../../../cards/skills/cards/references/operations.md
commanders-intent.md -> ../../../../cards/skills/cards/references/commanders-intent.md
```

Edit those files here; the symlinks keep both consumers on the same content.

The `interview-<type>.md` files are **not** symlinked, and must not be. The copies here are pre-creation — no card exists yet. `$interview` keeps its own post-creation copies, which interview against an existing CARD.md. The two sets are deliberately different documents.

## Markdown Formatting

Fragment links, mermaid diagrams, collapsible sections, and code blocks are consolidated in the `$markdown` skill; each card-type guide references those guidelines in its writing principles.
