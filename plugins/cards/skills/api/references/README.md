# Card-Type Writing Guides

These reference files are the single source of truth for card-type writing
guidance. Each file teaches how to compose a CARD.md for a specific card type.

## Consumers

Two paths load these guides:

1. **Card creation** (`cards:api` skill) — reads a reference file to guide
   CARD.md composition when creating a new card.
2. **Interview skills** (`runtime:interview-*`) — symlink each reference into
   their skill directory and load it via `@${CLAUDE_SKILL_DIR}/<type>.md` so
   the writing guide is in context during the interview.

## Symlinks

Each interview skill directory contains a symlink back to this directory:

```
runtime/skills/interview-bug-report/bug-report.md       -> ../../../cards/skills/api/references/bug-report.md
runtime/skills/interview-enhancement/enhancement.md      -> ../../../cards/skills/api/references/enhancement.md
runtime/skills/interview-investigation/investigation.md  -> ../../../cards/skills/api/references/investigation.md
runtime/skills/interview-documentation/documentation.md  -> ../../../cards/skills/api/references/documentation.md
runtime/skills/interview-maintenance/maintenance.md      -> ../../../cards/skills/api/references/maintenance.md
runtime/skills/interview-operations/operations.md        -> ../../../cards/skills/api/references/operations.md
```

Edit the files here; the symlinks ensure both consumers see the same content.
