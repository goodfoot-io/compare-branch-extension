// Manifest-driven multi-target build for @cards.management/agent-hooks.
//
// Emits all nine plugin payloads — the three Claude targets (core, assistant,
// runtime) and the three Codex targets (core, assistant, runtime), each via its
// SDK CLI, plus the three OpenCode targets (core → cards, assistant →
// cards-assistant, runtime → runtime) emitted directly with esbuild — into
// their existing output directories under public/, with the exact per-target
// flags inherited from the former package.json `build` scripts. Each target
// globs only its own handler directory; shared leaves in src/shared/ are pulled
// into every bundle through normal imports, never added to an input glob
// (matching today, where the hook CLI ignores non-hook modules).
//
// Plain Node ESM, consistent with scripts/validate.mjs and scripts/typecheck.mjs
// at the workspace root — no TS-runner tooling.

import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

// The hook CLI JS entry points, resolved through each package's `exports` map
// and spawned with `process.execPath` (see {@link buildTarget}). We deliberately
// do NOT spawn the bare `.bin` shim: on Windows that shim is a `.cmd`, which Node
// can only launch through a shell (`shell: true`), and cmd.exe then mangles any
// `--executable` argument containing shell metacharacters (`"`, `$()`, `||`,
// `2>`) before the CLI ever parses argv — silently truncating the stamped hook
// command and breaking its trust hash. Resolving `dist/cli.js` and running
// `node <entry> …` passes argv verbatim on every platform. The `./*` subpath in
// each package's `exports` maps `<pkg>/cli` → `./dist/cli.js`.
const claudeCli = fileURLToPath(import.meta.resolve('@goodfoot/claude-code-hooks/cli'));
const codexCli = fileURLToPath(import.meta.resolve('@goodfoot/codex-hooks/cli'));

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
 * The six build targets. `cli` pins the correct SDK CLI per agent; `clean`
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
    // No stamped log env var: the bundle installs its own computed default via
    // src/shared/default-log-file.ts, and the operator override is the upstream
    // name (CLAUDE_CODE_HOOKS_LOG_FILE) the logger singleton reads by default.
    logEnvVar: null
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
  },
  {
    name: 'codex-core',
    cli: codexCli,
    input: 'src/codex/core/**/*.ts',
    outBase: '../../codex/cards',
    output: '../../codex/cards/hooks/hooks.json',
    clean: ['hooks'],
    loaders: [],
    logEnvVar: null
  }
];

/**
 * The three OpenCode build targets.
 *
 * OpenCode v1.18.21 plugins are in-process modules executed by the host's
 * embedded Bun — there is no hooks.json and nothing to stamp (no
 * ELECTRON_RUN_AS_NODE / VSCODE_NODE indirection). Each target bundles every
 * handler under its own `src/opencode/<area>/` directory into one
 * self-contained `<name>.mjs` per handler at `<outBase>/<name>.mjs`, exporting
 * the plugin factory functions verbatim. Bundling is required because the
 * emitted files run from installed payload locations where the workspace
 * packages (`@cards.management/sdk`, …) do not resolve; only Node builtins and
 * the editor-only `vscode` module stay external.
 */
const opencodeTargets = [
  {
    name: 'opencode-core',
    input: 'src/opencode/core/**/*.ts',
    // Core handlers ship with the `cards` plugin, mirroring the Codex layout.
    outBase: '../../opencode/cards/plugin'
  },
  {
    name: 'opencode-assistant',
    input: 'src/opencode/assistant/**/*.ts',
    outBase: '../../opencode/cards-assistant/plugin'
  },
  {
    name: 'opencode-runtime',
    input: 'src/opencode/runtime/**/*.ts',
    outBase: '../../opencode/runtime/plugin'
  }
];

/**
 * Recursively lists the `.ts` entry files under a directory relative to the
 * package root, sorted for deterministic output ordering.
 *
 * @param dirRel - Directory to scan, relative to the package root.
 * @returns Absolute paths of every `.ts` file beneath it (sorted).
 */
function listEntryFiles(dirRel) {
  const absDir = path.resolve(packageRoot, dirRel);
  const entries = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.ts')) {
        entries.push(path.join(dir, entry.name));
      }
    }
  };

  walk(absDir);
  return entries.sort();
}

/**
 * Resolves the concrete directory to scan from a target's glob-style `input`
 * by cutting at the first wildcard segment, so an input like
 * `src/x/(star)(star)/star.ts` scans `src/x`.
 *
 * @param input - The target's input glob.
 * @returns Directory path relative to the package root.
 */
function inputScanRoot(input) {
  const wildcard = input.indexOf('*');
  const dir = wildcard === -1 ? path.dirname(input) : input.slice(0, wildcard);
  return dir.replace(/[/\\]+$/, '');
}

/**
 * Builds one OpenCode target: cleans the output directory, then bundles each
 * handler source into a flat `<basename>.mjs` beside its siblings via esbuild.
 *
 * Flags follow the pinned decision for this emitter: ESM output on the Node
 * platform (`platform: 'browser'` is wrong — these modules import `node:*`
 * builtins), `esnext` target for Bun, full bundling, `vscode` external. The
 * banner bridges one gap between the two: bundled CommonJS dependencies that
 * `require()` Node builtins compile to esbuild's `__require` shim, which has
 * no `require` binding under strict ESM. OpenCode's Bun tolerates it, but the
 * banner gives every runtime a working binding instead of relying on that.
 *
 * @param {typeof opencodeTargets[number]} target - Target descriptor.
 */
async function buildOpencodeTarget(target) {
  const esbuild = require('esbuild');
  const outDir = path.resolve(packageRoot, target.outBase);

  rmSync(outDir, { recursive: true, force: true });

  const entryFiles = listEntryFiles(inputScanRoot(target.input));
  if (entryFiles.length === 0) {
    throw new Error(`target ${target.name} has no entry files under ${target.input}`);
  }

  await Promise.all(
    entryFiles.map((entryFile) =>
      esbuild.build({
        entryPoints: [entryFile],
        outfile: path.join(outDir, `${path.basename(entryFile, '.ts')}.mjs`),
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'esnext',
        external: ['vscode'],
        banner: {
          js: [
            "import { createRequire as cardsCreateRequire } from 'node:module';",
            'const require = cardsCreateRequire(import.meta.url);'
          ].join('\n')
        },
        sourcemap: false,
        legalComments: 'none',
        logLevel: 'warning'
      })
    )
  );
}

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

  // Run the resolved CLI entry directly via node — never the PATH `.bin` shim —
  // so argv (notably `--executable`, which carries shell metacharacters) reaches
  // the CLI byte-for-byte on Windows as well as POSIX. See the `claudeCli` /
  // `codexCli` note above.
  const result = spawnSync(process.execPath, [target.cli, ...args], {
    cwd: packageRoot,
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error(`target ${target.name} failed with exit code ${result.status}`);
  }
}

// Exported build manifest — side-effect-free. Consumers (e.g. tests) can import
// EXECUTABLE, targets, and opencodeTargets without triggering the build.
export { EXECUTABLE, targets, opencodeTargets, listEntryFiles, inputScanRoot, buildOpencodeTarget };

// Only run the build when executed directly (not when imported as a module).
// Guard on argv[1] being defined: an importer with no script argument (e.g.
// `node -e 'import(...)'`) leaves it undefined, and pathToFileURL(undefined)
// would throw at evaluation time before the importer receives the exports.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Wipe the package-local dist first: it holds only the completion manifest
  // that the build-unchanged gate (see package.json `build`) writes after a
  // successful run, so removing it now is what invalidates a stale manifest
  // when a new build starts — an interrupted build must never leave
  // yesterday's proof of completion on disk.
  rmSync(path.resolve(packageRoot, 'dist'), { recursive: true, force: true });

  for (const target of targets) {
    console.log(`\n[agent-hooks] building ${target.name}`);
    buildTarget(target);
  }

  for (const target of opencodeTargets) {
    console.log(`\n[agent-hooks] building ${target.name}`);
    await buildOpencodeTarget(target);
  }

  console.log('\n[agent-hooks] all nine targets built');
}
