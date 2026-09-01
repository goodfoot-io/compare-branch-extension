/**
 * Process tree utilities for locating supported agent ancestor processes.
 *
 * @summary Process tree utilities for locating supported agent ancestor processes
 * @module lib/process-tree
 */

import { execFile } from 'node:child_process';
import { readFile, readlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Maximum depth to walk up the process tree. */
export const PROCESS_TREE_MAX_DEPTH = 10;

/** Whether the current host is Windows. */
const IS_WINDOWS = process.platform === 'win32';

/** Whether the current host exposes Linux procfs process identity. */
const IS_LINUX = process.platform === 'linux';

/** Whether the current host exposes Darwin `ps` and text-vnode identity. */
const IS_DARWIN = process.platform === 'darwin';

/**
 * Set of normalized command names that identify shell processes the walk skips.
 *
 * On POSIX the value compared is the kernel `comm` (15-char truncated basename
 * of the executable). On Windows it is the `Win32_Process.Name`, normalized to
 * the same key space by {@link normalizeComm} (lowercased, executable extension
 * stripped) so `Bash.exe`/`cmd.exe` collapse onto `bash`/`cmd`. The Windows
 * shells (`cmd`, `powershell`, `pwsh`) are included because Claude Code runs
 * hooks through Git Bash and `cross-spawn` routes the agent launch through
 * `cmd.exe`, both of which can appear as ancestors of the hook process. The
 * first ancestor whose normalized name is *not* in this set is the agent.
 */
const SHELL_COMMS = new Set(['bash', 'zsh', 'sh', 'dash', 'fish', 'ksh', 'cmd', 'powershell', 'pwsh']);

/**
 * Process identity used while walking the tree: the command name and parent PID.
 */
interface ProcessInfo {
  /** Command name (POSIX `comm` / Windows `Win32_Process.Name`). */
  comm: string;
  /** Parent process ID. */
  ppid: number;
}

/** Snapshot entry used to prove an owned agent subtree is drained. */
interface ProcessTreeEntry {
  pid: number;
  ppid: number;
}

/** Stable identity and lifecycle evidence for one process. */
interface ProcessIdentity extends ProcessTreeEntry {
  /** Kernel-backed absolute executable path. */
  executable: string;
  /** Process group ID, or `null` where the host does not expose one. */
  processGroupId: number | null;
  /** Stable operating-system session identity. */
  sessionId: string;
  /** Kernel-backed creation identity that changes when a PID is reused. */
  startIdentity: string;
}

/** Windows CIM row before relevant-subtree identity is required. */
interface WindowsProcessSnapshotEntry extends ProcessTreeEntry {
  /** Executable path when CIM grants access. */
  executable: string | null;
  /** Windows does not expose a POSIX process group. */
  processGroupId: null;
  /** Numeric OS session when CIM supplies a valid value. */
  sessionId: number | null;
  /** Creation ticks when CIM grants access. */
  startIdentity: string | null;
}

/** Relevant portions of a process tree for strict drain classification. */
interface DrainTopology {
  /** PIDs outside the hook branch that may represent work or infrastructure. */
  candidatePids: number[];
  /** Agent descendants excluding transient children below the hook probe. */
  stableEntries: ProcessTreeEntry[];
}

/**
 * Normalizes a command name to the {@link SHELL_COMMS} key space.
 *
 * Lowercases and strips a trailing Windows executable extension so a Windows
 * `Win32_Process.Name` such as `Bash.exe` or `cmd.exe` compares equal to the
 * POSIX `comm` values `bash`/`cmd`.
 *
 * @param comm - Raw command name from `ps` or `Win32_Process`.
 * @returns The normalized command key.
 */
function normalizeComm(comm: string): string {
  return comm
    .trim()
    .toLowerCase()
    .replace(/\.(exe|com|bat|cmd)$/, '');
}

/**
 * Builds the platform invocation that reports a process's name and parent PID.
 *
 * On Windows the fields come from a PowerShell CIM query emitting
 * `Name|ParentProcessId`; `ps` is not available. On POSIX a single `ps`
 * invocation emits both fields.
 *
 * @param pid - Process ID to inspect.
 * @returns The executable and argument vector to execute.
 */
function buildProcessInfoInvocation(pid: number): { file: string; args: string[] } {
  if (IS_WINDOWS) {
    return {
      file: 'powershell',
      args: [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' | Select-Object -First 1 | ForEach-Object { $_.Name + '|' + $_.ParentProcessId }`
      ]
    };
  }
  return { file: 'ps', args: ['-p', String(pid), '-o', 'comm=,ppid='] };
}

/**
 * Parses the raw output of {@link buildProcessInfoInvocation} into a {@link ProcessInfo}.
 *
 * Windows output is `Name|ParentProcessId`. POSIX `ps` output is the command
 * name followed by the parent PID, whitespace-separated; the parent PID is the
 * trailing numeric token and the command name is everything before it.
 *
 * @param raw - Trimmed command output.
 * @returns Parsed process info, or `null` when the output is empty or malformed.
 */
function parseProcessInfo(raw: string): ProcessInfo | null {
  if (!raw) return null;

  if (IS_WINDOWS) {
    const sep = raw.lastIndexOf('|');
    if (sep < 0) return null;
    const comm = raw.slice(0, sep).trim();
    const ppid = Number.parseInt(raw.slice(sep + 1).trim(), 10);
    if (!comm || Number.isNaN(ppid)) return null;
    return { comm, ppid };
  }

  const tokens = raw.split(/\s+/);
  const ppid = Number.parseInt(tokens[tokens.length - 1] ?? '', 10);
  const comm = tokens.slice(0, -1).join(' ').trim();
  if (!comm || Number.isNaN(ppid)) return null;
  return { comm, ppid };
}

/**
 * Returns the command name and parent PID for `pid`, or `null` on failure.
 *
 * A single async subprocess reports both fields. Returns `null` when the
 * process is gone, the query fails or times out, or the output cannot be
 * parsed.
 *
 * @param pid - Process ID to inspect.
 * @returns The process info, or `null` when unavailable.
 */
async function getProcessInfo(pid: number): Promise<ProcessInfo | null> {
  const { file, args } = buildProcessInfoInvocation(pid);
  try {
    const { stdout } = await execFileAsync(file, args, {
      encoding: 'utf8',
      timeout: 5000
    });
    return parseProcessInfo(stdout.trim());
  } catch {
    return null;
  }
}

/**
 * Walks the process tree upward from `startPid` (default: `process.ppid`)
 * skipping shell processes and returning the first non-shell ancestor PID.
 *
 * Under shell-skip the first non-shell ancestor *is* the agent process. The
 * walk traverses at most {@link PROCESS_TREE_MAX_DEPTH} levels and is
 * cross-platform: it resolves each process's name and parent PID via `ps` on
 * POSIX and a PowerShell `Win32_Process` query on Windows. Each step is an
 * asynchronous subprocess (`execFile`) so the event loop is never blocked
 * while awaiting the result.
 *
 * @param startPid - Optional root PID for traversal. When omitted, traversal
 *   starts at the parent of the current hook process.
 * @returns The first non-shell ancestor PID, or `null` when no non-shell
 *   ancestor is found within {@link PROCESS_TREE_MAX_DEPTH}.
 */
export async function findAgentPid(startPid?: number): Promise<number | null> {
  let pid = startPid ?? process.ppid;

  for (let depth = 0; depth < PROCESS_TREE_MAX_DEPTH; depth++) {
    if (pid <= 1) return null;

    const info = await getProcessInfo(pid);
    if (info === null) return null;

    if (!SHELL_COMMS.has(normalizeComm(info.comm))) return pid;

    // Stop on a missing or self-parenting PID that would otherwise loop.
    if (info.ppid <= 0 || info.ppid === pid) return null;
    pid = info.ppid;
  }

  return null;
}

/**
 * Reads the host process topology without trusting command names or arguments.
 *
 * @returns All PID/PPID pairs, or `null` when the snapshot is malformed.
 */
async function readProcessTopology(): Promise<ProcessTreeEntry[] | null> {
  const invocation = IS_WINDOWS
    ? {
        file: 'powershell',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          "Get-CimInstance Win32_Process | ForEach-Object { $_.ProcessId.ToString() + '|' + $_.ParentProcessId.ToString() }"
        ]
      }
    : { file: 'ps', args: ['-e', '-o', 'pid=,ppid='] };
  try {
    const { stdout } = await execFileAsync(invocation.file, invocation.args, { encoding: 'utf8', timeout: 5000 });
    const entries = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [pidText, ppidText] = IS_WINDOWS ? line.split('|') : line.split(/\s+/);
        return { pid: Number.parseInt(pidText ?? '', 10), ppid: Number.parseInt(ppidText ?? '', 10) };
      });
    if (
      entries.some(
        (entry) =>
          !Number.isSafeInteger(entry.pid) || entry.pid <= 0 || !Number.isSafeInteger(entry.ppid) || entry.ppid < 0
      ) ||
      new Set(entries.map((entry) => entry.pid)).size !== entries.length
    ) {
      return null;
    }
    return entries;
  } catch {
    return null;
  }
}

/**
 * Extracts the stable subtree used for drain classification.
 *
 * Proper descendants of the hook PID are excluded because they are probe
 * machinery created while readiness is being measured. The hook itself and
 * its ancestry remain stable evidence.
 *
 * @param entries - One validated process topology snapshot.
 * @param agentPid - Owning native agent PID.
 * @param hookPid - Current Stop-hook PID.
 * @returns Relevant topology and candidate PIDs, or `null` for an invalid tree.
 */
function deriveDrainTopology(entries: ProcessTreeEntry[], agentPid: number, hookPid: number): DrainTopology | null {
  const byPid = new Map(entries.map((entry) => [entry.pid, entry]));
  if (!byPid.has(agentPid) || !byPid.has(hookPid)) return null;

  const children = new Map<number, number[]>();
  for (const entry of entries) {
    const siblings = children.get(entry.ppid) ?? [];
    siblings.push(entry.pid);
    children.set(entry.ppid, siblings);
  }
  const descendantsOf = (rootPid: number): Set<number> => {
    const result = new Set<number>();
    const pending = [rootPid];
    while (pending.length > 0) {
      const pid = pending.pop();
      if (pid === undefined || result.has(pid)) continue;
      result.add(pid);
      pending.push(...(children.get(pid) ?? []));
    }
    return result;
  };

  const agentSubtree = descendantsOf(agentPid);
  if (!agentSubtree.has(hookPid)) return null;
  const hookSubtree = descendantsOf(hookPid);
  const hookAncestry = new Set<number>();
  let cursor = hookPid;
  while (cursor !== agentPid) {
    if (hookAncestry.has(cursor)) return null;
    hookAncestry.add(cursor);
    const parent = byPid.get(cursor)?.ppid;
    if (parent === undefined || !agentSubtree.has(parent)) return null;
    cursor = parent;
  }
  hookAncestry.add(agentPid);

  const stableEntries = entries
    .filter((entry) => agentSubtree.has(entry.pid) && (entry.pid === hookPid || !hookSubtree.has(entry.pid)))
    .sort((left, right) => left.pid - right.pid);
  const candidatePids = stableEntries.filter((entry) => !hookAncestry.has(entry.pid)).map((entry) => entry.pid);
  return { candidatePids, stableEntries };
}

/**
 * Parses the stable Linux identity fields from `/proc/<pid>/stat`.
 *
 * @param raw - Raw procfs stat record.
 * @param expectedPid - PID whose procfs entry was opened.
 * @returns Parsed lifecycle fields, or `null` when the record is malformed.
 */
function parseLinuxStat(
  raw: string,
  expectedPid: number
): Pick<ProcessIdentity, 'pid' | 'ppid' | 'processGroupId' | 'sessionId' | 'startIdentity'> | null {
  const match = raw.trim().match(/^(\d+) \(.*\) \S (.*)$/);
  if (!match) return null;
  const pid = Number.parseInt(match[1] ?? '', 10);
  const fields = (match[2] ?? '').split(/\s+/);
  const ppid = Number.parseInt(fields[0] ?? '', 10);
  const processGroupId = Number.parseInt(fields[1] ?? '', 10);
  const sessionId = Number.parseInt(fields[2] ?? '', 10);
  const startIdentity = fields[18] ?? '';
  if (
    pid !== expectedPid ||
    !Number.isSafeInteger(ppid) ||
    ppid < 0 ||
    !Number.isSafeInteger(processGroupId) ||
    processGroupId <= 0 ||
    !Number.isSafeInteger(sessionId) ||
    sessionId <= 0 ||
    !/^\d+$/.test(startIdentity)
  ) {
    return null;
  }
  return { pid, ppid, processGroupId, sessionId: String(sessionId), startIdentity };
}

/**
 * Inspects one Linux process through kernel-backed procfs identities.
 *
 * @param entry - Topology entry the procfs identity must corroborate.
 * @returns Complete process identity, or `null` on exit, reuse, or denial.
 */
async function inspectLinuxProcess(entry: ProcessTreeEntry): Promise<ProcessIdentity | null> {
  try {
    const stat = parseLinuxStat(await readFile(`/proc/${entry.pid}/stat`, 'utf8'), entry.pid);
    if (stat === null || stat.ppid !== entry.ppid) return null;
    const executable = await readlink(`/proc/${entry.pid}/exe`);
    if (!isAbsolute(executable) || executable.endsWith(' (deleted)')) return null;
    return { ...stat, executable };
  } catch {
    return null;
  }
}

/**
 * Inspects one Darwin process using lifecycle fields and its kernel text vnode.
 *
 * Darwin has no procfs executable symlink. Its native `lsof` text descriptor is
 * the kernel-backed executable provenance; exactly one absolute text vnode is
 * required so mapped files or denied inspection cannot become infrastructure.
 *
 * @param entry - Topology entry the native evidence must corroborate.
 * @returns Complete process identity, or `null` on ambiguity or denial.
 */
async function inspectDarwinProcess(entry: ProcessTreeEntry): Promise<ProcessIdentity | null> {
  try {
    const { stdout: lifecycleOutput } = await execFileAsync(
      'ps',
      ['-p', String(entry.pid), '-o', 'pid=,ppid=,pgid=,sess=,lstart='],
      { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' }, timeout: 5000 }
    );
    const tokens = lifecycleOutput.trim().split(/\s+/);
    const pid = Number.parseInt(tokens[0] ?? '', 10);
    const ppid = Number.parseInt(tokens[1] ?? '', 10);
    const processGroupId = Number.parseInt(tokens[2] ?? '', 10);
    const sessionPointer = tokens[3] ?? '';
    const normalizedSessionPointer = sessionPointer.toLowerCase().replace(/^0x/, '');
    const startedAt = Date.parse(tokens.slice(4).join(' '));
    if (
      pid !== entry.pid ||
      ppid !== entry.ppid ||
      !Number.isSafeInteger(processGroupId) ||
      processGroupId <= 0 ||
      !/^[0-9a-f]+$/.test(normalizedSessionPointer) ||
      BigInt(`0x${normalizedSessionPointer}`) <= 0n ||
      !Number.isSafeInteger(startedAt) ||
      startedAt < 0
    ) {
      return null;
    }

    const { stdout: lsofOutput } = await execFileAsync(
      '/usr/sbin/lsof',
      ['-a', '-p', String(entry.pid), '-d', 'txt', '-Fn'],
      { encoding: 'utf8', timeout: 5000 }
    );
    const executablePaths = [
      ...new Set(
        lsofOutput
          .split(/\r?\n/)
          .filter((line) => line.startsWith('n'))
          .map((line) => line.slice(1))
          .filter((path) => isAbsolute(path) && !path.endsWith(' (deleted)'))
      )
    ];
    if (executablePaths.length !== 1) return null;
    return {
      executable: executablePaths[0]!,
      pid,
      ppid,
      processGroupId,
      sessionId: BigInt(`0x${normalizedSessionPointer}`).toString(),
      startIdentity: String(startedAt)
    };
  } catch {
    return null;
  }
}

/**
 * Reads creation, session, and executable identity for every Windows process.
 *
 * The CIM query returns an empty executable/creation field when access is not
 * available; callers reject such a row if it belongs to the relevant subtree.
 *
 * @returns Complete Windows process identities, or `null` on malformed output.
 */
async function readWindowsProcessSnapshot(): Promise<WindowsProcessSnapshotEntry[] | null> {
  const script =
    "$items = Get-CimInstance Win32_Process; $items | ForEach-Object { $path = if ($null -eq $_.ExecutablePath) { '' } else { $_.ExecutablePath }; $created = if ($null -eq $_.CreationDate) { '' } else { $_.CreationDate.ToUniversalTime().Ticks.ToString() }; $_.ProcessId.ToString() + '|' + $_.ParentProcessId.ToString() + '||' + $_.SessionId.ToString() + '|' + $created + '|' + $path }";
  try {
    const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8',
      timeout: 5000
    });
    const entries = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line): WindowsProcessSnapshotEntry | null => {
        const fields = line.split('|');
        const pid = Number.parseInt(fields[0] ?? '', 10);
        const ppid = Number.parseInt(fields[1] ?? '', 10);
        const sessionId = Number.parseInt(fields[3] ?? '', 10);
        const startIdentity = fields[4] ?? '';
        const executable = fields[5] ?? '';
        if (fields.length !== 6 || !Number.isSafeInteger(pid) || pid <= 0 || !Number.isSafeInteger(ppid) || ppid < 0) {
          return null;
        }
        return {
          executable: isAbsolute(executable) ? executable : null,
          pid,
          ppid,
          processGroupId: null,
          sessionId: Number.isSafeInteger(sessionId) && sessionId >= 0 ? sessionId : null,
          startIdentity: /^\d+$/.test(startIdentity) ? startIdentity : null
        };
      });
    if (entries.some((entry) => entry === null)) return null;
    const identities = entries.filter((entry): entry is WindowsProcessSnapshotEntry => entry !== null);
    if (new Set(identities.map((entry) => entry.pid)).size !== identities.length) return null;
    return identities;
  } catch {
    return null;
  }
}

/**
 * Requires complete executable and lifecycle proof for a relevant Windows row.
 *
 * @param entry - CIM row belonging to the stable agent subtree.
 * @returns Complete identity, or `null` when CIM could not prove it.
 */
function requireWindowsIdentity(entry: WindowsProcessSnapshotEntry): ProcessIdentity | null {
  if (entry.executable === null || entry.sessionId === null || entry.startIdentity === null) return null;
  return {
    executable: entry.executable,
    pid: entry.pid,
    ppid: entry.ppid,
    processGroupId: null,
    sessionId: String(entry.sessionId),
    startIdentity: entry.startIdentity
  };
}

/**
 * Compares repeated identity evidence, including executable path and PID age.
 *
 * @param first - First identity sample.
 * @param second - Revalidated identity sample.
 * @returns Whether both samples identify the same process lifetime.
 */
function identitiesMatch(first: ProcessIdentity, second: ProcessIdentity): boolean {
  const firstExecutable = IS_WINDOWS ? first.executable.toLowerCase() : first.executable;
  const secondExecutable = IS_WINDOWS ? second.executable.toLowerCase() : second.executable;
  return (
    first.pid === second.pid &&
    first.ppid === second.ppid &&
    first.processGroupId === second.processGroupId &&
    first.sessionId === second.sessionId &&
    first.startIdentity === second.startIdentity &&
    firstExecutable === secondExecutable
  );
}

/**
 * Verifies the compound lifecycle contract of Codex's persistent code-mode host.
 *
 * @param agent - Native Codex process identity.
 * @param candidate - Candidate infrastructure process identity.
 * @returns Whether every platform-supported proof identifies the helper.
 */
function isVerifiedPersistentCodexHelper(agent: ProcessIdentity, candidate: ProcessIdentity): boolean {
  const normalizedAgentName = basename(agent.executable)
    .replace(/\.(exe|com)$/i, '')
    .toLowerCase();
  const normalizedCandidateName = basename(candidate.executable)
    .replace(/\.(exe|com)$/i, '')
    .toLowerCase();
  const agentDirectory = IS_WINDOWS ? dirname(agent.executable).toLowerCase() : dirname(agent.executable);
  const candidateDirectory = IS_WINDOWS ? dirname(candidate.executable).toLowerCase() : dirname(candidate.executable);
  return (
    normalizedAgentName === 'codex' &&
    normalizedCandidateName === 'codex-code-mode-host' &&
    candidateDirectory === agentDirectory &&
    candidate.ppid === agent.pid &&
    candidate.sessionId === agent.sessionId &&
    BigInt(candidate.startIdentity) >= BigInt(agent.startIdentity) &&
    (!(IS_LINUX || IS_DARWIN) || candidate.processGroupId === candidate.pid)
  );
}

/**
 * Classifies a coherent, identity-enriched agent subtree.
 *
 * @param topology - Stable topology and candidate processes.
 * @param identities - Revalidated identities keyed by PID.
 * @param agentPid - Owning native Codex PID.
 * @returns Drain readiness, with `false` for known non-infrastructure work.
 */
function classifyDrainTopology(
  topology: DrainTopology,
  identities: Map<number, ProcessIdentity>,
  agentPid: number
): boolean | null {
  const agent = identities.get(agentPid);
  if (agent === undefined) return null;
  for (const pid of topology.candidatePids) {
    const candidate = identities.get(pid);
    if (candidate === undefined) return null;
    if (!isVerifiedPersistentCodexHelper(agent, candidate)) return false;
  }
  return true;
}

/**
 * Proves that an agent subtree contains no process outside the currently
 * executing hook branch. Query failure is represented by `null` so callers can
 * fail closed.
 *
 * @param agentPid - Root PID that owns the Codex action subtree.
 * @param hookPid - PID of the Stop hook process.
 * @returns `true` when only the hook ancestry/probe branch remains, `false`
 *   when another owned process exists, or `null` when state is unknowable.
 */
export async function isAgentProcessTreeDrained(agentPid: number, hookPid = process.pid): Promise<boolean | null> {
  if (IS_WINDOWS) {
    const firstSnapshot = await readWindowsProcessSnapshot();
    if (firstSnapshot === null) return null;
    const firstTopology = deriveDrainTopology(firstSnapshot, agentPid, hookPid);
    if (firstTopology === null) return null;

    const secondSnapshot = await readWindowsProcessSnapshot();
    if (secondSnapshot === null) return null;
    const secondTopology = deriveDrainTopology(secondSnapshot, agentPid, hookPid);
    if (secondTopology === null || JSON.stringify(firstTopology) !== JSON.stringify(secondTopology)) return null;
    const firstByPid = new Map(firstSnapshot.map((entry) => [entry.pid, entry]));
    const secondByPid = new Map(secondSnapshot.map((entry) => [entry.pid, entry]));
    const stableIdentities = new Map<number, ProcessIdentity>();
    for (const entry of secondTopology.stableEntries) {
      const firstEntry = firstByPid.get(entry.pid);
      const secondEntry = secondByPid.get(entry.pid);
      if (firstEntry === undefined || secondEntry === undefined) return null;
      const first = requireWindowsIdentity(firstEntry);
      const second = requireWindowsIdentity(secondEntry);
      if (first === null || second === null || !identitiesMatch(first, second)) return null;
      stableIdentities.set(entry.pid, second);
    }
    const finalSnapshot = await readWindowsProcessSnapshot();
    if (finalSnapshot === null) return null;
    const finalTopology = deriveDrainTopology(finalSnapshot, agentPid, hookPid);
    if (finalTopology === null || JSON.stringify(secondTopology) !== JSON.stringify(finalTopology)) return null;
    const finalByPid = new Map(finalSnapshot.map((entry) => [entry.pid, entry]));
    const finalIdentities = new Map<number, ProcessIdentity>();
    for (const entry of finalTopology.stableEntries) {
      const second = stableIdentities.get(entry.pid);
      const finalEntry = finalByPid.get(entry.pid);
      if (second === undefined || finalEntry === undefined) return null;
      const final = requireWindowsIdentity(finalEntry);
      if (final === null || !identitiesMatch(second, final)) return null;
      finalIdentities.set(entry.pid, final);
    }
    return classifyDrainTopology(finalTopology, finalIdentities, agentPid);
  }

  const firstEntries = await readProcessTopology();
  if (firstEntries === null) return null;
  const firstTopology = deriveDrainTopology(firstEntries, agentPid, hookPid);
  if (firstTopology === null) return null;
  if (!(IS_LINUX || IS_DARWIN)) return firstTopology.candidatePids.length === 0;

  const inspectProcess = IS_LINUX ? inspectLinuxProcess : inspectDarwinProcess;

  const firstIdentities = new Map<number, ProcessIdentity>();
  for (const entry of firstTopology.stableEntries) {
    const identity = await inspectProcess(entry);
    if (identity === null) return null;
    firstIdentities.set(entry.pid, identity);
  }

  const secondEntries = await readProcessTopology();
  if (secondEntries === null) return null;
  const secondTopology = deriveDrainTopology(secondEntries, agentPid, hookPid);
  if (secondTopology === null || JSON.stringify(firstTopology) !== JSON.stringify(secondTopology)) return null;
  const secondIdentities = new Map<number, ProcessIdentity>();
  for (const entry of secondTopology.stableEntries) {
    const identity = await inspectProcess(entry);
    const firstIdentity = firstIdentities.get(entry.pid);
    if (identity === null || firstIdentity === undefined || !identitiesMatch(firstIdentity, identity)) return null;
    secondIdentities.set(entry.pid, identity);
  }
  const finalEntries = await readProcessTopology();
  if (finalEntries === null) return null;
  const finalTopology = deriveDrainTopology(finalEntries, agentPid, hookPid);
  if (finalTopology === null || JSON.stringify(secondTopology) !== JSON.stringify(finalTopology)) return null;
  return classifyDrainTopology(finalTopology, secondIdentities, agentPid);
}
