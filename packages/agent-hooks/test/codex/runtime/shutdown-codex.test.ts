import { type ChildProcess, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

interface Snapshot {
  pid: number;
  ppid: number;
  uid: number;
  state: string;
  startTime: string;
  argv: string[];
}

interface Operations {
  currentPid: number;
  currentUid: number | null;
  inspect(pid: number): Promise<Snapshot>;
  signal(pid: number, signal: NodeJS.Signals): void;
  wait(ms: number): Promise<void>;
  now(): string;
}

interface ShutdownModule {
  readAncestry(operations: Operations): Promise<Snapshot[]>;
  selectLauncher(ancestry: Snapshot[], currentUid: number | null): Snapshot;
  shutdownCodex(options: {
    operations: Operations;
    auditPath: string;
    graceMs?: number;
    pollMs?: number;
  }): Promise<{ ok: boolean; pid: number | null; signal: string; result: string; error?: string }>;
}

const executablePath = resolve(import.meta.dirname, '../../../../../codex/runtime/skills/card/bin/shutdown-codex.mjs');
const shutdownModule = (await import(executablePath)) as ShutdownModule;
const tempPaths: string[] = [];
const children: ChildProcess[] = [];

function snapshot(pid: number, ppid: number, argv: string[], overrides: Partial<Snapshot> = {}): Snapshot {
  return { pid, ppid, uid: 1000, state: 'S', startTime: `start-${pid}`, argv, ...overrides };
}

function operationsFor(entries: Snapshot[], signals: Array<[number, NodeJS.Signals]> = []): Operations {
  const byPid = new Map(entries.map((entry) => [entry.pid, entry]));
  return {
    currentPid: entries[0]!.pid,
    currentUid: 1000,
    async inspect(pid) {
      const entry = byPid.get(pid);
      if (!entry) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
      return { ...entry, argv: [...entry.argv] };
    },
    signal(pid, signal) {
      signals.push([pid, signal]);
      byPid.delete(pid);
    },
    async wait() {},
    now: () => '2026-08-13T00:00:00.000Z'
  };
}

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
  await Promise.all(tempPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('Codex shutdown executable', () => {
  it('selects the sole owned live Node codex.js ancestor and sends only SIGTERM to its positive PID', async () => {
    const launcher = snapshot(30, 20, ['/usr/bin/node', '/opt/lib/node_modules/@openai/codex/bin/codex.js']);
    const entries = [
      snapshot(50, 40, ['/usr/bin/node', executablePath]),
      snapshot(40, 30, ['/opt/codex-aarch64-unknown-linux-gnu/codex']),
      launcher,
      snapshot(20, 1, ['/bin/bash']),
      snapshot(1, 0, ['/sbin/init'])
    ];
    const signals: Array<[number, NodeJS.Signals]> = [];
    const root = await mkdtemp(join(tmpdir(), 'codex-shutdown-unit-'));
    tempPaths.push(root);

    const result = await shutdownModule.shutdownCodex({
      operations: operationsFor(entries, signals),
      auditPath: join(root, 'audit.jsonl')
    });

    expect(result).toMatchObject({ ok: true, pid: 30, signal: 'SIGTERM', result: 'exited' });
    expect(signals).toEqual([[30, 'SIGTERM']]);
    const audit = (await readFile(join(root, 'audit.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(audit).toMatchObject([
      { event: 'signal-intent', pid: 30, signal: 'SIGTERM', result: 'validated' },
      { event: 'shutdown-result', pid: 30, signal: 'SIGTERM', result: 'exited' }
    ]);
  });

  it.each([
    [
      'shell only',
      [snapshot(3, 2, ['/usr/bin/node', executablePath]), snapshot(2, 1, ['/bin/bash']), snapshot(1, 0, ['/sbin/init'])]
    ],
    [
      'native child only',
      [
        snapshot(3, 2, ['/usr/bin/node', executablePath]),
        snapshot(2, 1, ['/opt/codex']),
        snapshot(1, 0, ['/sbin/init'])
      ]
    ],
    [
      'wrong owner',
      [
        snapshot(3, 2, ['/usr/bin/node', executablePath]),
        snapshot(2, 1, ['/usr/bin/node', '/x/@openai/codex/bin/codex.js'], { uid: 999 }),
        snapshot(1, 0, ['/sbin/init'])
      ]
    ],
    [
      'zombie',
      [
        snapshot(3, 2, ['/usr/bin/node', executablePath]),
        snapshot(2, 1, ['/usr/bin/node', '/x/@openai/codex/bin/codex.js'], { state: 'Z' }),
        snapshot(1, 0, ['/sbin/init'])
      ]
    ],
    [
      'ambiguous',
      [
        snapshot(4, 3, ['/usr/bin/node', executablePath]),
        snapshot(3, 2, ['/usr/bin/node', '/a/@openai/codex/bin/codex.js']),
        snapshot(2, 1, ['/usr/bin/node', '/b/@openai/codex/bin/codex.js']),
        snapshot(1, 0, ['/sbin/init'])
      ]
    ]
  ])('fails closed without signaling for %s ancestry', async (_name, entries) => {
    const signals: Array<[number, NodeJS.Signals]> = [];
    const root = await mkdtemp(join(tmpdir(), 'codex-shutdown-refusal-'));
    tempPaths.push(root);
    const result = await shutdownModule.shutdownCodex({
      operations: operationsFor(entries, signals),
      auditPath: join(root, 'audit.jsonl')
    });
    expect(result).toMatchObject({ ok: false, result: 'refused' });
    expect(signals).toEqual([]);
    expect(await readFile(join(root, 'audit.jsonl'), 'utf8')).toContain('"result":"refused"');
  });

  it('rejects a launcher whose start identity changes during revalidation', async () => {
    const entries = [
      snapshot(4, 3, ['/usr/bin/node', executablePath]),
      snapshot(3, 2, ['/opt/codex']),
      snapshot(2, 1, ['/usr/bin/node', '/x/@openai/codex/bin/codex.js']),
      snapshot(1, 0, ['/sbin/init'])
    ];
    const base = operationsFor(entries);
    let launcherReads = 0;
    const operations: Operations = {
      ...base,
      async inspect(pid) {
        const value = await base.inspect(pid);
        if (pid === 2 && ++launcherReads === 2) return { ...value, startTime: 'reused' };
        return value;
      },
      signal() {
        throw new Error('must not signal');
      }
    };
    const root = await mkdtemp(join(tmpdir(), 'codex-shutdown-race-'));
    tempPaths.push(root);
    const result = await shutdownModule.shutdownCodex({ operations, auditPath: join(root, 'audit.jsonl') });
    expect(result).toMatchObject({
      ok: false,
      result: 'refused',
      error: 'launcher identity changed before signal delivery'
    });
  });

  it('audits a bounded timeout without escalating beyond the single SIGTERM', async () => {
    const entries = [
      snapshot(4, 3, ['/usr/bin/node', executablePath]),
      snapshot(3, 2, ['/opt/codex']),
      snapshot(2, 1, ['/usr/bin/node', '/x/@openai/codex/bin/codex.js']),
      snapshot(1, 0, ['/sbin/init'])
    ];
    const signals: Array<[number, NodeJS.Signals]> = [];
    const operations = operationsFor(entries, signals);
    operations.signal = (pid, signal) => signals.push([pid, signal]);
    const root = await mkdtemp(join(tmpdir(), 'codex-shutdown-timeout-'));
    tempPaths.push(root);
    const auditPath = join(root, 'audit.jsonl');

    const result = await shutdownModule.shutdownCodex({ operations, auditPath, graceMs: 1, pollMs: 2 });

    expect(result).toMatchObject({ ok: false, pid: 2, signal: 'SIGTERM', result: 'timeout' });
    expect(signals).toEqual([[2, 'SIGTERM']]);
    expect(await readFile(auditPath, 'utf8')).toContain('"result":"timeout"');
  });

  it('walks a real launcher -> native stand-in -> shutdown descendant and observes graceful launcher exit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codex-shutdown-real-'));
    tempPaths.push(root);
    const launcherPath = join(root, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    const nativePath = join(root, 'native.mjs');
    const auditPath = join(root, 'streams', 'codex-shutdown', 'real-tree.jsonl');
    await mkdir(join(root, 'node_modules', '@openai', 'codex', 'bin'), { recursive: true });
    await writeFile(
      launcherPath,
      `import {spawn} from 'node:child_process';\nconst child=spawn(process.execPath,[${JSON.stringify(nativePath)}],{stdio:'inherit',env:process.env});\nprocess.on('SIGTERM',()=>child.kill('SIGTERM'));\nchild.on('exit',(_c,s)=>s?process.kill(process.pid,s):process.exit(0));\n`
    );
    await writeFile(
      nativePath,
      `import {spawn} from 'node:child_process';\nconst child=spawn(process.execPath,[${JSON.stringify(executablePath)}],{stdio:'inherit',env:process.env});\nprocess.on('SIGTERM',()=>process.exit(0));\nchild.on('exit',c=>process.exitCode=c??1);\n`
    );
    const child = spawn(process.execPath, [launcherPath], {
      env: { ...process.env, CARD_REPO_PATH: root, CARDS_SESSION_ID: 'real-tree' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.push(child);
    let output = '';
    child.stdout!.on('data', (chunk) => (output += String(chunk)));
    child.stderr!.on('data', (chunk) => (output += String(chunk)));
    const launcherPid = child.pid!;
    await new Promise<void>((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`fixture timeout: ${output}`)), 10_000);
      child.on('close', () => {
        clearTimeout(timer);
        resolvePromise();
      });
    });
    const audit = await readFile(auditPath, 'utf8');
    expect(audit).toContain(`"pid":${launcherPid}`);
    expect(audit).toContain('"signal":"SIGTERM"');
    expect(audit).toContain('"result":"exited"');
  }, 15_000);
});
