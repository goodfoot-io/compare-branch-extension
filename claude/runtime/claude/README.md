# Runtime Claude Configuration

Context files provided to every Claude Code session launched by the extension. These files give Claude the domain knowledge it needs to work within the cards system.

## Files

### CLAUDE.md

Card repository reference documentation: environment variables, directory layout, metadata schemas, gate enforcement rules, comment/attachment conventions, and session transcript format.

**Delivery mechanism:** Passed via `--add-dir` pointing to this directory. The `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` environment variable tells Claude Code to load `CLAUDE.md` files from additional directories. This makes the content available to the main process and all teammates spawned via `--teammate-mode in-process`.

### COMMIT_MESSAGE_STYLE.md

Commit message style guides for the two repositories that receive commits during card work (card repo and workspace repo), plus markdown formatting guidelines for card content.

**Delivery mechanism:** Imported as a raw string at build time (esbuild `--loader .md=text`) and injected via `--append-system-prompt`. Unlike `CLAUDE.md`, this content is appended directly to the system prompt so it is always present regardless of teammate mode or directory resolution.

## Consumers

Both files are consumed by two independent launch paths:

| Launch path | Source file | Context |
|---|---|---|
| Card actions (launch, interview) | `public/packages/default-configuration/src/lib/claude-session.ts` | Spawns `claude` as a child process for card workflows |
| Start Cards Agent button | `packages/extension/src/lifecycle/cardsApiCommands.ts` | Opens an interactive `claude` terminal for ad-hoc card work |

## Packaging

This directory lives inside the runtime plugin at `public/plugins/runtime/claude/`. During the extension build, `copyMarketplace()` in `packages/extension/scripts/build/shared.js` copies the entire `public/plugins/` tree into `dist/marketplace/plugins/`. The launched Claude process receives the path `<extensionPath>/dist/marketplace/plugins/runtime/claude` via `--add-dir`.

The `COMMIT_MESSAGE_STYLE.md` import is resolved at bundle time by esbuild. The `.md: 'text'` loader entry in each build script (`build-production.js`, `build-dev-host.js`, `build-watch.js`, `build-debug.js`, `build-testing.js`) converts the markdown file into a string literal embedded in the JavaScript bundle. A corresponding `*.md` module declaration exists in both `packages/extension/src/types/markdown.d.ts` and `public/packages/default-configuration/src/types/markdown.d.ts` for TypeScript resolution.
