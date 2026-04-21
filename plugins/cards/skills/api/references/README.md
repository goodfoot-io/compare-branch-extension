# Card-Type References

Single source of truth for card-type guidance. Two files per card type:
- `<type>.md` — **writing guide**: target CARD.md structure.
- `interview-<type>.md` — **pre-creation interview guide**: how to reach enough signal before creating the card.

Plus one shared reference used by every card type:
- `commanders-intent.md` — first-principles guide for the opening paragraph(s) of `CARD.md`. Every writing guide and interview guide references it; do not duplicate its guidance elsewhere.

## Consumers

1. **Card creation** (`cards:api` skill) — loads both the interview and writing guide for the matched card type. Interview runs first; the writing guide shapes CARD.md at `card create` time.
2. **Interview skills** (`runtime:interview-*`) — symlink the **writing guide** (`<type>.md`) into their skill directory and load it via `./<type>.md` during the post-creation interview. The `interview-<type>.md` files are pre-creation only and are **not** symlinked into `runtime:interview-*`.

## Symlinks

Each interview skill directory contains a symlink back to this directory:

```
runtime/skills/interview-bug-report/bug-report.md       -> ../../../cards/skills/api/references/bug-report.md
runtime/skills/interview-enhancement/enhancement.md      -> ../../../cards/skills/api/references/enhancement.md
runtime/skills/interview-investigation/investigation.md  -> ../../../cards/skills/api/references/investigation.md
runtime/skills/interview-documentation/documentation.md  -> ../../../cards/skills/api/references/documentation.md
runtime/skills/interview-maintenance/maintenance.md      -> ../../../cards/skills/api/references/maintenance.md
runtime/skills/interview-operations/operations.md        -> ../../../cards/skills/api/references/operations.md
runtime/skills/interview-*/commanders-intent.md          -> ../../../cards/skills/api/references/commanders-intent.md
```

Edit the files here; the symlinks ensure both consumers see the same content.

## Markdown Formatting

Markdown formatting guidelines (fragment links, mermaid diagrams, collapsible
sections, code blocks) are consolidated in the `cards:markdown` skill. Each
card-type guide references those guidelines in its writing principles.
