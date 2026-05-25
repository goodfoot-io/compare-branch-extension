/**
 * Regression test: generated hook commands must tolerate a VSCODE_NODE path
 * that contains spaces.
 *
 * Claude Code runs each hook's `command` string through `/bin/sh -c`. The
 * command resolves the Node.js interpreter from `~/.cards/VSCODE_NODE`, which
 * the extension populates with `process.execPath`. On VS Code that path is the
 * Electron helper, e.g.
 *
 *   /Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/...
 *
 * which contains spaces (and parentheses). If the command interpolates that
 * path without quoting, the shell word-splits it and tries to execute
 * `/Applications/Visual`, producing:
 *
 *   /bin/sh: /Applications/Visual: No such file or directory
 *
 * This test generates the real hooks.json with the same generator invocation the
 * package build uses, then executes every generated command with a spaced
 * VSCODE_NODE path and asserts the interpreter is invoked with the compiled
 * `.mjs` handler as its single argument.
 *
 * @summary Hook commands quote the VSCODE_NODE interpreter path
 */

import { execSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface HooksJson {
  hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>>;
}

/**
 * Extracts the `claude-code-hooks ...` invocation from the package's `build`
 * script and redirects its output to a temp file, leaving every other argument
 * (notably `--executable`) byte-for-byte identical to the production build.
 *
 * @param outputFile - Absolute path the generator should write hooks.json to.
 * @returns The generator command line with its output redirected to `outputFile`.
 * @throws If the build script does not invoke claude-code-hooks or output redirection fails.
 */
function buildGeneratorCommand(outputFile: string): string {
  const pkg = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8')) as {
    scripts: { build: string };
  };
  const buildScript = pkg.scripts.build;
  const start = buildScript.indexOf('claude-code-hooks');
  if (start === -1) {
    throw new Error(`build script does not invoke claude-code-hooks: ${buildScript}`);
  }
  const invocation = buildScript.slice(start);
  const redirected = invocation.replace(/-o\s+"[^"]*"/, `-o "${outputFile}"`);
  if (redirected === invocation) {
    throw new Error(`could not redirect generator output in: ${invocation}`);
  }
  return redirected;
}

/**
 * Resolves the directory CLAUDE_PLUGIN_ROOT must point at so that
 * `$CLAUDE_PLUGIN_ROOT/<rel>` resolves to the generated handler at `binDir`.
 *
 * @param scriptToken - The `$CLAUDE_PLUGIN_ROOT/...` handler token from a hook command.
 * @param binDir - Absolute path to the generated `bin` directory holding the handler.
 * @returns The directory to assign to CLAUDE_PLUGIN_ROOT.
 */
function resolvePluginRoot(scriptToken: string, binDir: string): string {
  const marker = '$CLAUDE_PLUGIN_ROOT/';
  expect(scriptToken.startsWith(marker)).toBe(true);
  const rel = scriptToken.slice(marker.length);
  const actualFile = path.join(binDir, path.basename(rel));
  expect(actualFile.endsWith(rel)).toBe(true);
  return actualFile.slice(0, actualFile.length - rel.length).replace(/\/$/, '');
}

describe('generated hook commands tolerate spaces in VSCODE_NODE', () => {
  let workDir: string;
  let hooksJson: HooksJson;
  let binDir: string;
  let fakeHome: string;
  let marker: string;

  beforeAll(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'vscode-node-quoting-'));

    const outputFile = path.join(workDir, 'cards', 'hooks', 'hooks.json');
    const generatorCommand = buildGeneratorCommand(outputFile);
    execSync(generatorCommand, {
      cwd: packageDir,
      env: {
        ...process.env,
        PATH: `${path.join(packageDir, 'node_modules', '.bin')}:${process.env['PATH'] ?? ''}`
      },
      stdio: 'pipe'
    });

    hooksJson = JSON.parse(readFileSync(outputFile, 'utf-8')) as HooksJson;
    binDir = path.join(path.dirname(outputFile), 'bin');

    // A fake Node interpreter living under a path that contains a space and
    // parentheses, mirroring the VS Code "Code Helper (Plugin)" execPath. It
    // records its argument vector so we can prove it was invoked correctly.
    fakeHome = path.join(workDir, 'home');
    marker = path.join(workDir, 'argv.txt');
    const fakeNodeDir = path.join(fakeHome, 'My Editor (Plugin)', 'bin');
    mkdirSync(fakeNodeDir, { recursive: true });
    mkdirSync(path.join(fakeHome, '.cards'), { recursive: true });
    const fakeNode = path.join(fakeNodeDir, 'node');
    writeFileSync(
      fakeNode,
      `#!/bin/sh\n{ echo "ARGC=$#"; for a in "$@"; do echo "ARG=$a"; done; } > "${marker}"\n`,
      'utf-8'
    );
    chmodSync(fakeNode, 0o755);
    writeFileSync(path.join(fakeHome, '.cards', 'VSCODE_NODE'), fakeNode, 'utf-8');
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('generates at least one hook command', () => {
    const commands = Object.values(hooksJson.hooks)
      .flat()
      .flatMap((entry) => entry.hooks.map((h) => h.command));
    expect(commands.length).toBeGreaterThan(0);
  });

  it('every hook command invokes the spaced interpreter with the handler as a single argument', () => {
    const commands = Object.values(hooksJson.hooks)
      .flat()
      .flatMap((entry) => entry.hooks.map((h) => h.command));

    for (const command of commands) {
      rmSync(marker, { force: true });

      const scriptToken = command.trim().split(/\s+/).pop();
      expect(scriptToken).toBeDefined();
      const pluginRoot = resolvePluginRoot(scriptToken!, binDir);

      const result = spawnSync('/bin/sh', ['-c', command], {
        env: { ...process.env, HOME: fakeHome, CLAUDE_PLUGIN_ROOT: pluginRoot },
        encoding: 'utf-8'
      });

      // The interpreter must have actually run. Word-splitting a spaced path
      // makes the shell fail with "No such file or directory" before the fake
      // Node ever executes, leaving no marker.
      let recorded: string;
      try {
        recorded = readFileSync(marker, 'utf-8');
      } catch {
        throw new Error(
          `Interpreter never executed for command: ${command}\nshell stderr: ${result.stderr}\nshell status: ${result.status}`
        );
      }

      const argcLine = recorded.split('\n').find((l) => l.startsWith('ARGC='));
      const argLines = recorded
        .split('\n')
        .filter((l) => l.startsWith('ARG='))
        .map((l) => l.slice('ARG='.length));

      expect(argcLine).toBe('ARGC=1');
      expect(argLines).toHaveLength(1);
      expect(path.basename(argLines[0]!)).toBe(path.basename(scriptToken!));
    }
  });
});
