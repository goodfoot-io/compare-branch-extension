/**
 * Phase 4 tests: per-worktree hook delivery.
 *
 * Covers the createWorktree pre-settle block (A2 race fix / D9 ordering /
 * D10a guard) and the generated dispatcher scripts (D2 stdin classification,
 * D3 exit-code propagation, D11 no-stdin-hang). No mocks — real git worktrees,
 * real bash invocation of the generated dispatcher scripts.
 *
 * @summary Phase 4 per-worktree hook provisioning + dispatcher script tests
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorktree } from '../src/worktree.js';

const CARDS_WORKTREES_DIR_KEY = 'CARDS_WORKTREES_DIR';

function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('bash', ['-c', `echo '# test' > README.md`], { cwd: dir });
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

function gitWorktreeConfig(worktreeDir: string, key: string): string | null {
  try {
    return execFileSync('git', ['-C', worktreeDir, 'config', '--worktree', key], {
      encoding: 'utf8'
    }).trim();
  } catch {
    return null;
  }
}

describe('createWorktree per-worktree hook provisioning', () => {
  let tmpBase = '';
  let repoDir = '';
  let worktreesDir = '';
  let mjsDir = '';
  let homeDir = '';
  let sharedHooksDir = '';
  let compiledScriptPaths: Record<string, string>;
  const originalEnv = process.env;

  beforeEach(async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'wht-test-'));
    repoDir = path.join(tmpBase, 'repo');
    worktreesDir = path.join(tmpBase, 'worktrees');
    mjsDir = path.join(tmpBase, 'git-hooks');
    homeDir = path.join(tmpBase, 'home');
    sharedHooksDir = path.join(homeDir, '.cards', 'workspace-hooks');
    await fs.mkdir(repoDir);
    await fs.mkdir(worktreesDir);
    await fs.mkdir(mjsDir);
    await fs.mkdir(homeDir);
    initGitRepo(repoDir);

    // Real compiled-artifact stand-ins: a node script per Cards-active type
    // that records its invocation so dispatcher tests can assert delivery.
    for (const hook of ['pre-commit', 'post-commit', 'post-rewrite']) {
      const p = path.join(mjsDir, `${hook}.mjs`);
      await fs.writeFile(
        p,
        `import fs from 'node:fs';\n` +
          `let stdin='';try{stdin=fs.readFileSync(0,'utf8');}catch{}\n` +
          `fs.appendFileSync(process.env.CARDS_TEST_LOG, 'cards:${hook}:'+process.argv.slice(2).join(',')+':'+stdin+'\\n');\n`
      );
    }
    compiledScriptPaths = {
      'pre-commit': path.join(mjsDir, 'pre-commit.mjs'),
      'post-commit': path.join(mjsDir, 'post-commit.mjs'),
      'post-rewrite': path.join(mjsDir, 'post-rewrite.mjs')
    };

    process.env = { ...originalEnv, [CARDS_WORKTREES_DIR_KEY]: worktreesDir, HOME: homeDir };
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true });
      tmpBase = '';
    }
  });

  it('writes .cards/CARD_ID and .cards/CARD_ORIGINAL_HOOK_PATH before settle resolves (A2)', async () => {
    const { path: wPath, settle } = await createWorktree('cards/main-1/1', {
      cwd: repoDir,
      cardId: 'main-1',
      compiledScriptPaths
    });

    // Inspect immediately — do NOT await settle. The agent could commit here.
    const cardId = await fs.readFile(path.join(wPath, '.cards', 'CARD_ID'), 'utf8');
    expect(cardId).toBe('main-1\n');
    const orig = await fs.readFile(path.join(wPath, '.cards', 'CARD_ORIGINAL_HOOK_PATH'), 'utf8');
    expect(orig).toBe(path.join(repoDir, '.git', 'hooks'));

    await settle;
  });

  it('sets per-worktree core.hooksPath, with extensions.worktreeConfig set first (D9), before settle resolves', async () => {
    const { path: wPath, settle } = await createWorktree('cards/main-2/1', {
      cwd: repoDir,
      cardId: 'main-2',
      compiledScriptPaths
    });

    // Both git-config invariants must hold before settle is awaited.
    const worktreeConfigEnabled = execFileSync('git', ['-C', repoDir, 'config', 'extensions.worktreeConfig'], {
      encoding: 'utf8'
    }).trim();
    expect(worktreeConfigEnabled).toBe('true');

    expect(gitWorktreeConfig(wPath, 'core.hooksPath')).toBe(sharedHooksDir);

    await settle;
  });

  it('writes a dispatcher script for every client-side hook type plus the three Cards .mjs', async () => {
    const { settle } = await createWorktree('cards/main-3/1', {
      cwd: repoDir,
      cardId: 'main-3',
      compiledScriptPaths
    });
    await settle;

    const entries = (await fs.readdir(sharedHooksDir)).sort();
    const expectedHooks = [
      'applypatch-msg',
      'pre-applypatch',
      'post-applypatch',
      'pre-commit',
      'prepare-commit-msg',
      'commit-msg',
      'post-commit',
      'pre-rebase',
      'post-checkout',
      'post-merge',
      'pre-push',
      'post-rewrite',
      'reference-transaction',
      'post-index-change',
      'pre-merge-commit',
      'sendemail-validate',
      'push-to-checkout'
    ];
    for (const h of expectedHooks) {
      expect(entries).toContain(h);
    }
    expect(entries).toContain('pre-commit.mjs');
    expect(entries).toContain('post-commit.mjs');
    expect(entries).toContain('post-rewrite.mjs');
  });

  // Regression: dispatchers resolve $NODE_RUN to the bundled VSCODE_NODE, which
  // is a desktop VS Code's Electron binary. git spawns these hooks without
  // ELECTRON_RUN_AS_NODE=1, so without the export every commit pops a focus-
  // stealing Electron GUI window (very visible on a macOS host).
  it('exports ELECTRON_RUN_AS_NODE in the Cards-hook dispatchers', async () => {
    const { settle } = await createWorktree('cards/main-6/1', {
      cwd: repoDir,
      cardId: 'main-6',
      compiledScriptPaths
    });
    await settle;

    for (const hook of ['post-commit', 'pre-commit', 'post-rewrite']) {
      const content = await fs.readFile(path.join(sharedHooksDir, hook), 'utf-8');
      expect(content).toContain('export ELECTRON_RUN_AS_NODE=1');
    }
  });

  it('does NOT set core.hooksPath when cardId is omitted (unbound worktree, no hook injection)', async () => {
    const { path: wPath, settle } = await createWorktree('feature/unbound', { cwd: repoDir });
    await settle;

    expect(gitWorktreeConfig(wPath, 'core.hooksPath')).toBeNull();
    await expect(fs.access(sharedHooksDir)).rejects.toMatchObject({
      code: 'ENOENT'
    });
  });

  it('throws the D10a guard when cardId is set without compiledScriptPaths', async () => {
    await expect(createWorktree('cards/main-4/1', { cwd: repoDir, cardId: 'main-4' })).rejects.toThrow(
      /compiledScriptPaths required/
    );
  });

  it('rejects an empty cardId', async () => {
    await expect(createWorktree('cards/main-5/1', { cwd: repoDir, cardId: '', compiledScriptPaths })).rejects.toThrow(
      /non-empty/
    );
  });
});

describe('generated dispatcher scripts', () => {
  let tmpBase = '';
  let sharedDir = '';
  let worktreeRoot = '';
  let originalHooksDir = '';
  let testLog = '';
  const originalEnv = process.env;

  /**
   * Provisions a shared hooks dir via a real card-bound worktree, then points
   * a synthetic worktree root at a controllable original-hooks dir so we can
   * exercise the dispatchers directly with bash.
   */
  beforeEach(async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'disp-test-'));
    const repoDir = path.join(tmpBase, 'repo');
    const worktreesDir = path.join(tmpBase, 'worktrees');
    const mjsDir = path.join(tmpBase, 'git-hooks');
    await fs.mkdir(repoDir);
    await fs.mkdir(worktreesDir);
    await fs.mkdir(mjsDir);
    initGitRepo(repoDir);

    testLog = path.join(tmpBase, 'invocations.log');
    await fs.writeFile(testLog, '');

    for (const hook of ['pre-commit', 'post-commit', 'post-rewrite']) {
      await fs.writeFile(
        path.join(mjsDir, `${hook}.mjs`),
        `import fs from 'node:fs';\n` +
          `let stdin='';try{stdin=fs.readFileSync(0,'utf8');}catch{}\n` +
          `fs.appendFileSync(process.env.CARDS_TEST_LOG, 'cards:${hook}:'+process.argv.slice(2).join(',')+':'+stdin+'\\n');\n`
      );
    }

    const homeDir = path.join(tmpBase, 'home');
    await fs.mkdir(homeDir);
    process.env = { ...originalEnv, [CARDS_WORKTREES_DIR_KEY]: worktreesDir, HOME: homeDir };
    const { path: wPath, settle } = await createWorktree('cards/main-9/1', {
      cwd: repoDir,
      cardId: 'main-9',
      compiledScriptPaths: {
        'pre-commit': path.join(mjsDir, 'pre-commit.mjs'),
        'post-commit': path.join(mjsDir, 'post-commit.mjs'),
        'post-rewrite': path.join(mjsDir, 'post-rewrite.mjs')
      }
    });
    await settle;

    sharedDir = path.join(homeDir, '.cards', 'workspace-hooks');

    // A real git worktree root so `git rev-parse --show-toplevel` resolves.
    worktreeRoot = wPath;
    originalHooksDir = path.join(tmpBase, 'orig-hooks');
    await fs.mkdir(originalHooksDir, { recursive: true });
    await fs.writeFile(path.join(worktreeRoot, '.cards', 'CARD_ORIGINAL_HOOK_PATH'), originalHooksDir);
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true });
      tmpBase = '';
    }
  });

  /**
   * Runs a dispatcher script with bash from inside the worktree root.
   *
   * @param hookType - Dispatcher script name to run.
   * @param args - Positional args passed to the hook.
   * @param stdin - Data piped to the hook's stdin.
   * @returns Process status, stdout, and stderr.
   */
  function runDispatcher(
    hookType: string,
    args: string[],
    stdin: string
  ): { status: number; stdout: string; stderr: string } {
    try {
      const stdout = execFileSync('bash', [path.join(sharedDir, hookType), ...args], {
        cwd: worktreeRoot,
        input: stdin,
        encoding: 'utf8',
        env: { ...process.env, CARDS_TEST_LOG: testLog }
      });
      return { status: 0, stdout, stderr: '' };
    } catch (e) {
      const err = e as { status?: number; stdout?: string; stderr?: string };
      return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
    }
  }

  async function makeOriginalHook(name: string, body: string): Promise<void> {
    const p = path.join(originalHooksDir, name);
    await fs.writeFile(p, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  }

  it('post-rewrite delivers identical stdin to both the Cards .mjs and the original hook (D2)', async () => {
    const origStdinCapture = path.join(tmpBase, 'orig-rewrite-stdin');
    await makeOriginalHook('post-rewrite', `cat > "${origStdinCapture}"`);

    const stdinPayload = 'oldsha newsha\nanother pair\n';
    const res = runDispatcher('post-rewrite', ['amend'], stdinPayload);
    expect(res.status).toBe(0);

    const log = await fs.readFile(testLog, 'utf8');
    expect(log).toContain(`cards:post-rewrite:amend:${stdinPayload}`);
    const origSeen = await fs.readFile(origStdinCapture, 'utf8');
    expect(origSeen).toBe(stdinPayload);
  });

  it('pre-push inherits stdin directly and propagates the original hook non-zero exit (D3)', async () => {
    await makeOriginalHook('pre-push', `read -r line; echo "got:$line"; exit 7`);

    const res = runDispatcher('pre-push', ['origin', 'url'], 'refdata\n');
    expect(res.status).toBe(7);
    expect(res.stdout).toContain('got:refdata');
    // No Cards .mjs for pre-push
    const log = await fs.readFile(testLog, 'utf8');
    expect(log).not.toContain('cards:pre-push');
  });

  it('reference-transaction is pass-through; original non-zero exit propagates (D3)', async () => {
    await makeOriginalHook('reference-transaction', `exit 3`);
    const res = runDispatcher('reference-transaction', ['committed'], 'a b ref\n');
    expect(res.status).toBe(3);
  });

  it('commit-msg forwards the $1 file path and never reads stdin', async () => {
    const seenArg = path.join(tmpBase, 'commit-msg-arg');
    await makeOriginalHook('commit-msg', `echo -n "$1" > "${seenArg}"`);

    const msgFile = path.join(tmpBase, 'COMMIT_EDITMSG');
    await fs.writeFile(msgFile, 'a message');
    // Provide stdin that must be ignored — a stdin-reading template would hang.
    const res = runDispatcher('commit-msg', [msgFile], 'SHOULD-BE-IGNORED');
    expect(res.status).toBe(0);
    expect(await fs.readFile(seenArg, 'utf8')).toBe(msgFile);
  });

  it('missing CARD_ORIGINAL_HOOK_PATH → dispatcher skips original and exits 0', async () => {
    await fs.rm(path.join(worktreeRoot, '.cards', 'CARD_ORIGINAL_HOOK_PATH'));
    const res = runDispatcher('post-commit', [], '');
    expect(res.status).toBe(0);
  });

  it('pre-commit blocks the commit fail-closed when the Cards .mjs exits non-zero', async () => {
    // Rewrite the compiled pre-commit to fail.
    const failingMjs = path.join(sharedDir, 'pre-commit.mjs');
    await fs.writeFile(failingMjs, `process.exit(42);\n`);
    const res = runDispatcher('pre-commit', [], '');
    expect(res.status).toBe(42);
  });

  it('post-commit runs the Cards hook then chains the original (D5)', async () => {
    const origMarker = path.join(tmpBase, 'orig-post-commit-ran');
    await makeOriginalHook('post-commit', `touch "${origMarker}"`);
    const res = runDispatcher('post-commit', [], '');
    expect(res.status).toBe(0);
    const log = await fs.readFile(testLog, 'utf8');
    expect(log).toContain('cards:post-commit:');
    await expect(fs.access(origMarker)).resolves.toBeUndefined();
  });
});
