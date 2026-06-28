# Interview References

Per-type reference files for the `$runtime:interview` skill. Two files per card type:
- `interview-<type>.md` — **interview guide**: how to conduct the post-creation interview and shape the card.
- `<type>.md` — **writing guide**: target CARD.md structure (symlinks to `$cards:cards` references — edit there).

Plus one shared reference:
- `commanders-intent.md` — first-principles for the opening paragraph of CARD.md (symlink to `$cards:cards` references).

## Consumer

**`$runtime:interview` skill** — loads `commanders-intent.md`, `<type>.md`, and `interview-<type>.md` in Step 3 after routing. The interview guide drives the post-creation interview; the writing guide shapes CARD.md structure.

## Type Mapping

| Card type | Interview guide | Writing guide |
|-----------|----------------|---------------|
| Bug, error, crash, regression | `interview-bug-report.md` | `bug-report.md` |
| Feature, improvement, new capability | `interview-enhancement.md` | `enhancement.md` |
| Research, spike, feasibility | `interview-investigation.md` | `investigation.md` |
| Documentation, guides, runbooks | `interview-documentation.md` | `documentation.md` |
| Refactor, cleanup, tech debt, upgrade | `interview-maintenance.md` | `maintenance.md` |
| Infrastructure, CI/CD, deploy | `interview-operations.md` | `operations.md` |

## Symlinks

Writing guides and `commanders-intent.md` are symlinked from `$cards:cards` references — edit those files there; the symlinks ensure both skills see the same content.

```
interview/references/bug-report.md        -> ../../../../cards/skills/api/references/bug-report.md
interview/references/enhancement.md       -> ../../../../cards/skills/api/references/enhancement.md
interview/references/investigation.md     -> ../../../../cards/skills/api/references/investigation.md
interview/references/documentation.md     -> ../../../../cards/skills/api/references/documentation.md
interview/references/maintenance.md       -> ../../../../cards/skills/api/references/maintenance.md
interview/references/operations.md        -> ../../../../cards/skills/api/references/operations.md
interview/references/commanders-intent.md -> ../../../../cards/skills/api/references/commanders-intent.md
```
