#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFile = promisify(execFileCallback);
const MANUAL_RECOVERY = 'Leave this session open and use the Cards action controls to cancel it manually.';

function parseProcStat(raw) {
  const end = raw.lastIndexOf(')');
  if (end < 0) throw new Error('malformed /proc stat');
  const fields = raw.slice(end + 2).trim().split(/\s+/);
  return { state: fields[0], ppid: Number(fields[1]), startTime: fields[19] };
}

async function inspectLinux(pid) {
  const [statRaw, statusRaw, cmdlineRaw] = await Promise.all([
    readFile(`/proc/${pid}/stat`, 'utf8'),
    readFile(`/proc/${pid}/status`, 'utf8'),
    readFile(`/proc/${pid}/cmdline`, 'utf8')
  ]);
  const stat = parseProcStat(statRaw);
  const uidMatch = /^Uid:\s+(\d+)/m.exec(statusRaw);
  if (!uidMatch || !Number.isSafeInteger(stat.ppid) || !stat.startTime) throw new Error(`incomplete process ${pid}`);
  return {
    pid,
    ppid: stat.ppid,
    uid: Number(uidMatch[1]),
    state: stat.state,
    startTime: stat.startTime,
    argv: cmdlineRaw.split('\0').filter(Boolean)
  };
}

async function inspectPortable(pid) {
  const { stdout } = await execFile('ps', ['-o', 'pid=,ppid=,uid=,state=,lstart=,command=', '-p', String(pid)], {
    encoding: 'utf8'
  });
  const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.{24})\s+(.+)$/s.exec(stdout.trimEnd());
  if (!match) throw new Error(`incomplete process ${pid}`);
  const command = match[6];
  const launcher = /^(\S*(?:node|node\.exe))\s+(\S*[\\/]@openai[\\/]codex[\\/]bin[\\/]codex\.js)(?:\s|$)/.exec(command);
  return {
    pid: Number(match[1]),
    ppid: Number(match[2]),
    uid: Number(match[3]),
    state: match[4][0],
    startTime: match[5].trim(),
    argv: launcher ? [launcher[1], launcher[2]] : [command]
  };
}

export function createSystemOperations() {
  return {
    currentPid: process.pid,
    currentUid: typeof process.getuid === 'function' ? process.getuid() : null,
    inspect: process.platform === 'linux' ? inspectLinux : inspectPortable,
    signal(pid, signal) {
      process.kill(pid, signal);
    },
    async wait(ms) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
    now: () => new Date().toISOString()
  };
}

function isNodeExecutable(value) {
  return /(^|[\\/])(?:node|node\.exe)$/.test(value);
}

function isCodexLauncher(snapshot) {
  if (snapshot.argv.length < 2 || !isNodeExecutable(snapshot.argv[0])) return false;
  return snapshot.argv.some((arg, index) => index > 0 && /[\\/]@openai[\\/]codex[\\/]bin[\\/]codex\.js$/.test(arg));
}

export async function readAncestry(operations, maxDepth = 64) {
  const ancestry = [];
  const visited = new Set();
  let pid = operations.currentPid;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!Number.isSafeInteger(pid) || pid <= 0 || visited.has(pid)) throw new Error('ancestry is incomplete or cyclic');
    visited.add(pid);
    const snapshot = await operations.inspect(pid);
    if (snapshot.pid !== pid || !Number.isSafeInteger(snapshot.ppid) || snapshot.ppid < 0) {
      throw new Error(`invalid process evidence for ${pid}`);
    }
    ancestry.push(snapshot);
    if (snapshot.ppid === 0) return ancestry;
    pid = snapshot.ppid;
  }
  throw new Error('ancestry exceeds safety limit');
}

export function selectLauncher(ancestry, currentUid) {
  if (currentUid === null || !Number.isSafeInteger(currentUid)) throw new Error('current process ownership is unavailable');
  if (ancestry.length === 0) throw new Error('ancestry is empty');
  const candidates = ancestry.filter(
    (entry) => entry.uid === currentUid && entry.state !== 'Z' && entry.pid > 1 && isCodexLauncher(entry)
  );
  if (candidates.length !== 1) throw new Error(`expected exactly one owned live Codex launcher ancestor; found ${candidates.length}`);
  return candidates[0];
}

function sameIdentity(expected, actual, currentUid) {
  return (
    actual.pid === expected.pid &&
    actual.uid === currentUid &&
    actual.state !== 'Z' &&
    actual.startTime === expected.startTime &&
    isCodexLauncher(actual)
  );
}

export function resolveAuditPath(env = process.env) {
  const cardRepoPath = env.CARD_REPO_PATH?.trim();
  const sessionId = env.CARDS_SESSION_ID?.trim();
  if (!cardRepoPath || !sessionId || !/^[A-Za-z0-9._-]+$/.test(sessionId)) {
    throw new Error('CARD_REPO_PATH and a safe CARDS_SESSION_ID are required for durable audit');
  }
  return join(cardRepoPath, 'streams', 'codex-shutdown', `${sessionId}.jsonl`);
}

async function appendAudit(auditPath, entry) {
  await mkdir(dirname(auditPath), { recursive: true });
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
}

export async function shutdownCodex({
  operations = createSystemOperations(),
  auditPath = resolveAuditPath(),
  graceMs = 5_000,
  pollMs = 50
} = {}) {
  let selected;
  try {
    const ancestry = await readAncestry(operations);
    selected = selectLauncher(ancestry, operations.currentUid);
    const revalidated = await operations.inspect(selected.pid);
    if (!sameIdentity(selected, revalidated, operations.currentUid)) throw new Error('launcher identity changed before signal delivery');
    await appendAudit(auditPath, {
      at: operations.now(),
      event: 'signal-intent',
      pid: selected.pid,
      signal: 'SIGTERM',
      startTime: selected.startTime,
      result: 'validated'
    });
    operations.signal(selected.pid, 'SIGTERM');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await appendAudit(auditPath, {
      at: operations.now(),
      event: 'shutdown-result',
      pid: selected?.pid ?? null,
      signal: 'SIGTERM',
      result: 'refused',
      error: message
    });
    return { ok: false, pid: selected?.pid ?? null, signal: 'SIGTERM', result: 'refused', error: message };
  }

  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    await operations.wait(pollMs);
    try {
      const current = await operations.inspect(selected.pid);
      if (!sameIdentity(selected, current, operations.currentUid)) {
        await appendAudit(auditPath, {
          at: operations.now(), event: 'shutdown-result', pid: selected.pid, signal: 'SIGTERM', result: 'exited'
        });
        return { ok: true, pid: selected.pid, signal: 'SIGTERM', result: 'exited' };
      }
    } catch {
      await appendAudit(auditPath, {
        at: operations.now(), event: 'shutdown-result', pid: selected.pid, signal: 'SIGTERM', result: 'exited'
      });
      return { ok: true, pid: selected.pid, signal: 'SIGTERM', result: 'exited' };
    }
  }
  await appendAudit(auditPath, {
    at: operations.now(), event: 'shutdown-result', pid: selected.pid, signal: 'SIGTERM', result: 'timeout'
  });
  return { ok: false, pid: selected.pid, signal: 'SIGTERM', result: 'timeout', error: 'launcher did not exit within grace period' };
}

export async function main() {
  let result;
  try {
    result = await shutdownCodex();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Codex shutdown refused: ${message}\n${MANUAL_RECOVERY}\n`);
    process.exitCode = 1;
    return;
  }
  const line = `Codex shutdown: pid=${result.pid ?? 'none'} signal=${result.signal} result=${result.result}`;
  if (result.ok) process.stdout.write(`${line}\n`);
  else process.stderr.write(`${line}: ${result.error}\n${MANUAL_RECOVERY}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
