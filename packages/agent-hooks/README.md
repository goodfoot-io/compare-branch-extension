# @cards.management/agent-hooks

The single home for Cards agent-hook source. It consolidates the five former
`@cards/{claude-code-hooks-api,claude-code-hooks-assistant,claude-code-hooks-runtime,codex-hooks-assistant,codex-hooks-runtime}`
packages into one workspace package with a manifest-driven multi-target build.

## Layout

- `src/shared/` — SDK-agnostic leaves (`context.ts`, `file-tree.ts`, `resolve-head.ts`, `errors.ts`, `types/markdown.d.ts`), one copy each.
- `src/claude/{core,assistant,runtime}/` — Claude handlers built with `@goodfoot/agent-hooks/claude-code`.
- `src/codex/{assistant,runtime}/` — Codex handlers built with `@goodfoot/agent-hooks/codex`.
- `scripts/build.mjs` — declares the five build targets and emits each plugin payload into its existing output directory under `public/`.

## Build

`yarn build` runs all five targets via `scripts/build.mjs`. Each target globs only
its own handler directory; shared leaves are pulled in through normal imports.

Use `yarn test`, `yarn lint`, and `yarn typecheck` to validate the whole surface in one invocation.
