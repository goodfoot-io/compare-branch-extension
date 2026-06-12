// Manifest-driven multi-target build for @cards/agent-hooks.
//
// Emits all five plugin payloads — the three Claude targets (core, assistant,
// runtime) and the two Codex targets (assistant, runtime) — into their existing
// output directories under public/, with the exact per-target flags inherited
// from the five former package.json `build` scripts. Each target globs only its
// own handler directory; shared leaves in src/shared/ are pulled into every
// bundle through normal imports, never added to an input glob (matching today,
// where the hook CLI ignores non-hook modules).
//
// Plain Node ESM, consistent with scripts/validate.mjs and scripts/typecheck.mjs
// at the workspace root — no TS-runner tooling.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

// The hook CLI bin names, spawned through the PATH yarn provides when it runs
// this package's `build` script — exactly how the five former package scripts
// invoked them. Their `exports` maps block resolving `dist/cli.js` directly, so
// the bare bin name is the supported entry point.
const claudeCli = 'claude-code-hooks';
const codexCli = 'codex-hooks';

// The VSCODE_NODE executable wrapper, embedded verbatim into every hooks.json
// command string. The `$(...)` is intentionally NOT command-substituted — the
// CLI stamps this literal string (including the surrounding quotes) so the
// plugin resolves the VS Code-bundled Node at runtime.
//
// `ELECTRON_RUN_AS_NODE=1` forces a desktop VS Code's Electron binary to run as
// a headless Node interpreter rather than launching a GUI window. The agent CLI
// (claude/codex) spawns these hook commands and does NOT set the var, so without
// it every hook invocation (SessionStart, PostToolUse, Stop, …) pops a focus-
// stealing Electron window on a macOS host where VSCODE_NODE is the Electron
// `code` binary. It is a no-op for a real `node` on PATH.
const EXECUTABLE = 'ELECTRON_RUN_AS_NODE=1 "$(cat $HOME/.cards/VSCODE_NODE 2>/dev/null || echo node)"';

const TEXT_LOADERS = ['--loader', '.md=text', '--loader', '.txt=text'];

/**
 * The five build targets. `cli` pins the correct SDK CLI per agent; `clean`
 * lists the output subdirectories to remove before compiling (relative to the
 * target's output base); `logEnvVar` is the Claude-only `--log-env-var` name.
 */
const targets = [
  {
    name: 'claude-core',
    cli: claudeCli,
    input: 'src/claude/core/**/*.ts',
    outBase: '../../claude/cards',
    output: '../../claude/cards/hooks/hooks.json',
    clean: ['hooks'],
    loaders: [],
    logEnvVar: 'CARDS_CLAUDE_CODE_HOOKS_LOG_FILE'
  },
  {
    name: 'claude-assistant',
    cli: claudeCli,
    input: 'src/claude/assistant/**/*.ts',
    outBase: '../../claude/cards-assistant',
    output: '../../claude/cards-assistant/hooks/hooks.json',
    clean: ['hooks', 'bin', 'content'],
    loaders: TEXT_LOADERS,
    logEnvVar: 'CLAUDE_CODE_ASSISTANT_HOOKS_LOG_FILE'
  },
  {
    name: 'claude-runtime',
    cli: claudeCli,
    input: 'src/claude/runtime/**/*.ts',
    outBase: '../../claude/runtime',
    output: '../../claude/runtime/hooks/hooks.json',
    clean: ['hooks', 'bin', 'content'],
    loaders: TEXT_LOADERS,
    logEnvVar: 'CLAUDE_CODE_RUNTIME_HOOKS_LOG_FILE'
  },
  {
    name: 'codex-assistant',
    cli: codexCli,
    input: 'src/codex/assistant/**/*.ts',
    outBase: '../../codex/cards-assistant',
    output: '../../codex/cards-assistant/hooks/hooks.json',
    clean: ['hooks', 'bin', 'content'],
    loaders: TEXT_LOADERS,
    logEnvVar: null
  },
  {
    name: 'codex-runtime',
    cli: codexCli,
    input: 'src/codex/runtime/**/*.ts',
    outBase: '../../codex/runtime',
    output: '../../codex/runtime/hooks/hooks.json',
    clean: ['hooks', 'bin', 'content'],
    loaders: TEXT_LOADERS,
    logEnvVar: null
  }
];

function buildTarget(target) {
  // Pre-clean each output subdirectory (rm → compile), matching the
  // `node -e "...rmSync..."` prefix of each former build script.
  for (const sub of target.clean) {
    rmSync(path.resolve(packageRoot, target.outBase, sub), {
      recursive: true,
      force: true
    });
  }

  const args = ['-i', target.input, '-o', target.output, ...target.loaders];
  if (target.logEnvVar) {
    args.push('--log-env-var', target.logEnvVar);
  }
  args.push('--executable', EXECUTABLE);

  const result = spawnSync(target.cli, args, {
    cwd: packageRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    throw new Error(`target ${target.name} failed with exit code ${result.status}`);
  }
}

// Exported build manifest — side-effect-free. Consumers (e.g. tests) can import
// EXECUTABLE and targets without triggering the build.
export { EXECUTABLE, targets };

// Only run the build when executed directly (not when imported as a module).
// Guard on argv[1] being defined: an importer with no script argument (e.g.
// `node -e 'import(...)'`) leaves it undefined, and pathToFileURL(undefined)
// would throw at evaluation time before the importer receives the exports.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const target of targets) {
    console.log(`\n[agent-hooks] building ${target.name}`);
    buildTarget(target);
  }

  console.log('\n[agent-hooks] all five targets built');
}
