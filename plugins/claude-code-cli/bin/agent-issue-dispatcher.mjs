#!/usr/bin/env node
/**
 * agent-issue-dispatcher: Automated issue processing from the Issues API
 *
 * Discovers the Issues API for the current workspace, polls for issues with
 * needsAgentAttention == true, selects the highest-priority issue (by order),
 * extracts session IDs from comments, and launches Claude.
 *
 * Usage:
 *   agent-issue-dispatcher [OPTIONS]
 *
 * Options:
 *   -p, --poll    Enable polling mode (check for issues every second instead of exiting)
 *   -t, --test    Enable test mode (creates .CLAUDE_ACTIVE file when Claude is active)
 *   -h, --help    Show this help message and exit
 *
 * Environment Variables:
 *   CLAUDE_CMD - Path to claude executable (default: claude)
 *
 * Signal handling:
 *   SIGURG   - Claude is actively processing (from SessionStart/UserPromptSubmit hooks)
 *   SIGWINCH - Claude is idle/waiting for input (from Stop hook)
 *
 * Exit codes:
 *   0 - No issues needing attention (or clean exit from polling mode)
 *   1 - Error (missing dependency, lock conflict, API not found, etc.)
 */

import { spawn, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  openSync,
  closeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = `agent-issue-dispatcher - Automated issue processing from the Issues API

USAGE:
  agent-issue-dispatcher [OPTIONS]

OPTIONS:
  -p, --poll    Enable polling mode
                Instead of exiting when no issues need attention, continuously
                poll the Issues API once per second. When an issue needs attention
                and Claude is not active, starts a new Claude session.

  -t, --test    Enable test mode
                Creates a .CLAUDE_ACTIVE file in the working directory when
                CLAUDE_ACTIVE is true (Claude session is running). The file is
                removed when CLAUDE_ACTIVE becomes false. Useful for testing
                signal handling without running actual Claude sessions.

  -h, --help    Show this help message and exit

DESCRIPTION:
  Discovers the Issues API for the current workspace, polls for issues with
  needsAgentAttention == true, selects the highest-priority issue (by order),
  extracts session IDs from comments, and launches Claude.

  Issues are processed in the same order they appear in the webview UI:
  sorted by 'order' ascending within status sections. This means the issue
  at the top of the 'todo' list will be worked on first.

  In default mode, the dispatcher processes issues until none remain, then exits.
  In polling mode (-p), it continuously monitors for new issues.

ENVIRONMENT VARIABLES:
  CLAUDE_CMD    Path to claude executable (default: claude)

SIGNAL HANDLING:
  SIGURG        Claude is actively processing (from SessionStart/UserPromptSubmit).
                Sets CLAUDE_ACTIVE to 1.
  SIGWINCH      Claude is idle/waiting for input (from Stop hook).
                Sets CLAUDE_ACTIVE to 0.

EXIT CODES:
  0    No issues needing attention (or clean exit)
  1    Error (missing dependency, lock conflict, API not found, etc.)

EXAMPLES:
  # Process all issues needing attention, then exit
  agent-issue-dispatcher

  # Continuously poll for issues (daemon mode)
  agent-issue-dispatcher --poll

  # Use a custom claude command
  CLAUDE_CMD=/usr/local/bin/claude agent-issue-dispatcher -p
`;

// ============================================================================
// Configuration
// ============================================================================

const DISCOVERY_FILE = join(homedir(), '.compare-branch', 'issues-api.json');
const CLAUDE_CMD = process.env.CLAUDE_CMD || 'claude';

// ============================================================================
// State
// ============================================================================

let pollMode = false;
let testMode = false;
let claudeActive = false;
let lockFilePath = '';
let lockFd = null;
let claudeProcess = null;

// ============================================================================
// Utility Functions
// ============================================================================

function log(message) {
  process.stderr.write(`${message}\n`);
}

function getWorkspace() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return process.cwd();
  }
}

function md5Hash(str) {
  return createHash('md5').update(str).digest('hex').slice(0, 8);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchWithStatus(url) {
  try {
    const response = await fetch(url);
    return { status: response.status, data: response.ok ? await response.json() : null };
  } catch {
    return { status: 0, data: null };
  }
}

// ============================================================================
// Signal Handlers (execute immediately, even while child process is running)
// ============================================================================

function handleSigurg() {
  if (!claudeActive) {
    claudeActive = true;
    log('Signal: Claude session active');
    if (testMode) {
      try {
        writeFileSync('.CLAUDE_ACTIVE', '');
      } catch {
        // Ignore errors
      }
    }
  }
}

function handleSigwinch() {
  if (claudeActive) {
    claudeActive = false;
    log('Signal: Claude session idle');
    if (testMode && existsSync('.CLAUDE_ACTIVE')) {
      try {
        unlinkSync('.CLAUDE_ACTIVE');
      } catch {
        // Ignore errors
      }
    }
  }
}

// ============================================================================
// Cleanup
// ============================================================================

function cleanup() {
  // Remove test mode file if it exists
  if (testMode && existsSync('.CLAUDE_ACTIVE')) {
    try {
      unlinkSync('.CLAUDE_ACTIVE');
    } catch {
      // Ignore errors
    }
  }

  // Release and remove lock file
  if (lockFd !== null) {
    try {
      closeSync(lockFd);
    } catch {
      // Ignore errors
    }
    lockFd = null;
  }

  if (lockFilePath && existsSync(lockFilePath)) {
    try {
      unlinkSync(lockFilePath);
    } catch {
      // Ignore errors
    }
  }
}

// ============================================================================
// Lock File Management
// ============================================================================

function acquireLock(workspace) {
  const lockDir = join(homedir(), '.compare-branch');
  const workspaceHash = md5Hash(workspace);
  lockFilePath = join(lockDir, `.dispatcher-${workspaceHash}.lock`);

  // Ensure lock directory exists
  mkdirSync(lockDir, { recursive: true });

  // Check for stale lock
  if (existsSync(lockFilePath)) {
    try {
      const existingPid = parseInt(readFileSync(lockFilePath, 'utf-8').trim(), 10);
      if (existingPid) {
        try {
          // Check if process is alive (signal 0 doesn't kill, just checks)
          process.kill(existingPid, 0);
          // Process is alive - lock is held
          log(`Error: Another dispatcher is already running for workspace: ${workspace}`);
          process.exit(1);
        } catch {
          // Process is dead - stale lock
          log(`Removing stale lock (PID ${existingPid} no longer running)`);
          unlinkSync(lockFilePath);
        }
      }
    } catch {
      // Can't read lock file, try to remove it
      try {
        unlinkSync(lockFilePath);
      } catch {
        // Ignore
      }
    }
  }

  // Create lock file with our PID
  try {
    lockFd = openSync(lockFilePath, 'wx'); // Exclusive create
    writeFileSync(lockFilePath, `${process.pid}\n`);
  } catch (err) {
    if (err.code === 'EEXIST') {
      log(`Error: Another dispatcher is already running for workspace: ${workspace}`);
      process.exit(1);
    }
    throw err;
  }
}

// ============================================================================
// Command Validation
// ============================================================================

function checkCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

function buildPrompt(issueJson, baseUrl) {
  return `You are continuing work on an issue from the Issues API.

## API Connection
BASE_URL: ${baseUrl}

## Issue Details
\`\`\`json
${JSON.stringify(issueJson, null, 2)}
\`\`\`

## Instructions
1. Load the issues:api skill
2. Review the issue and any comments
3. Begin or continue work on the issue
4. Check for new comments on the issue before stopping`;
}

// ============================================================================
// Claude Process Management
// ============================================================================

let backgroundPollInterval = null;
let currentBaseUrl = '';

function startBackgroundPolling() {
  if (backgroundPollInterval) return;

  backgroundPollInterval = setInterval(async () => {
    // Only check if Claude is idle (not actively processing)
    if (claudeActive || !claudeProcess) return;

    try {
      const response = await fetch(`${currentBaseUrl}/issues`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.issues) return;

      const issuesNeedingAttention = data.issues.filter(
        (issue) => issue.needsAgentAttention === true
      );

      if (issuesNeedingAttention.length > 0) {
        log('New issue detected while Claude is idle. Sending SIGTERM...');
        if (claudeProcess) {
          claudeProcess.kill('SIGTERM');
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, 1000);
}

function stopBackgroundPolling() {
  if (backgroundPollInterval) {
    clearInterval(backgroundPollInterval);
    backgroundPollInterval = null;
  }
}

function launchClaude(prompt, sessionId) {
  return new Promise((resolve) => {
    const args = [];

    if (sessionId) {
      args.push('--resume', sessionId);
    }

    args.push(prompt);

    log(sessionId ? `Resuming session: ${sessionId}` : 'Starting new session');

    // Set DISPATCHER_PID so hooks can signal us
    const env = { ...process.env, DISPATCHER_PID: `${process.pid}` };

    claudeProcess = spawn(CLAUDE_CMD, args, {
      stdio: 'inherit',
      env,
    });

    // Mark as active immediately - SIGWINCH will set to false when idle
    claudeActive = true;
    if (testMode) {
      try {
        writeFileSync('.CLAUDE_ACTIVE', '');
      } catch {
        // Ignore errors
      }
    }

    claudeProcess.on('error', (err) => {
      log(`Error launching Claude: ${err.message}`);
      claudeProcess = null;
      stopBackgroundPolling();
      resolve(1);
    });

    claudeProcess.on('close', (code) => {
      claudeProcess = null;
      stopBackgroundPolling();
      resolve(code ?? 0);
    });

    // Start background polling when Claude is running (in poll mode)
    if (pollMode) {
      startBackgroundPolling();
    }
  });
}

// ============================================================================
// Main Loop
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  for (const arg of args) {
    switch (arg) {
      case '-p':
      case '--poll':
        pollMode = true;
        break;
      case '-t':
      case '--test':
        testMode = true;
        break;
      case '-h':
      case '--help':
        console.log(HELP_TEXT);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          log(`Error: Unknown option: ${arg}`);
          log('Use -h or --help for usage information');
          process.exit(1);
        } else {
          log(`Error: Unexpected argument: ${arg}`);
          log('Use -h or --help for usage information');
          process.exit(1);
        }
    }
  }

  // Check dependencies
  if (!checkCommand(CLAUDE_CMD)) {
    log(`Error: Required dependency 'CLAUDE_CMD (${CLAUDE_CMD})' not found`);
    process.exit(1);
  }

  // Get workspace
  const workspace = getWorkspace();

  // Acquire lock
  acquireLock(workspace);

  // Set up signal handlers (these execute immediately in Node.js!)
  process.on('SIGURG', handleSigurg);
  process.on('SIGWINCH', handleSigwinch);

  // Set up cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGHUP', () => {
    cleanup();
    process.exit(0);
  });

  // Check discovery file
  if (!existsSync(DISCOVERY_FILE)) {
    log(`Error: Discovery file not found at ${DISCOVERY_FILE}`);
    log(
      'Ensure VSCode is running with the Compare Branch extension and compareBranch.enableBranchIssues is enabled.'
    );
    process.exit(1);
  }

  // Read and validate discovery file
  let discovery;
  try {
    discovery = JSON.parse(readFileSync(DISCOVERY_FILE, 'utf-8'));
  } catch {
    log(`Error: Discovery file is not valid JSON: ${DISCOVERY_FILE}`);
    process.exit(1);
  }

  // Get API info for current workspace
  const apiInfo = discovery[workspace];
  if (!apiInfo || !apiInfo.host || !apiInfo.port) {
    log(`Error: No API entry found for workspace: ${workspace}`);
    log('');
    log('Available workspaces:');
    for (const ws of Object.keys(discovery)) {
      log(`  - ${ws}`);
    }
    process.exit(1);
  }

  const baseUrl = `http://${apiInfo.host}:${apiInfo.port}/api/v1`;
  currentBaseUrl = baseUrl; // Set for background polling

  log(`Dispatcher started for workspace: ${workspace}`);
  log(`API URL: ${baseUrl}`);
  if (pollMode) {
    log('Polling mode: enabled (checking every second)');
  }
  if (testMode) {
    log('Test mode: enabled (.CLAUDE_ACTIVE file tracks state)');
  }

  // Main loop
  while (true) {
    // Fetch issues
    let issuesResponse;
    try {
      issuesResponse = await fetchJson(`${baseUrl}/issues`);
    } catch (err) {
      log(`Warning: Failed to fetch issues: ${err.message}`);
      await sleep(5000);
      continue;
    }

    // Validate response
    if (!issuesResponse.issues) {
      log('Warning: Invalid response from API (missing .issues)');
      await sleep(5000);
      continue;
    }

    // Find highest-priority issue needing attention
    const issuesNeedingAttention = issuesResponse.issues
      .filter((issue) => issue.needsAgentAttention === true)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const issueId = issuesNeedingAttention[0]?.id;

    // If no issues need attention
    if (!issueId) {
      if (pollMode) {
        await sleep(1000);
        continue;
      } else {
        console.log('No issues need attention');
        process.exit(0);
      }
    }

    // In polling mode, only process if Claude is not active
    if (pollMode && claudeActive) {
      await sleep(1000);
      continue;
    }

    log(`Processing issue: ${issueId}`);

    // Fetch full issue details
    const issueResult = await fetchWithStatus(`${baseUrl}/issues/${issueId}`);

    if (issueResult.status === 404) {
      log(`Warning: Issue ${issueId} was deleted, continuing...`);
      continue;
    }

    if (issueResult.status !== 200 || !issueResult.data) {
      log(`Warning: Failed to fetch issue ${issueId} (HTTP ${issueResult.status})`);
      await sleep(5000);
      continue;
    }

    const issueJson = issueResult.data;

    // Validate issue JSON
    if (!issueJson.id) {
      log('Warning: Invalid issue response (missing .id)');
      await sleep(5000);
      continue;
    }

    // Extract latest sessionId from comments
    const commentsWithSession = (issueJson.comments || []).filter(
      (c) => c.sessionId && c.sessionId !== ''
    );
    const sessionId = commentsWithSession.length > 0 ? commentsWithSession.at(-1).sessionId : null;

    // Build prompt
    const prompt = buildPrompt(issueJson, baseUrl);

    // Launch Claude
    const exitCode = await launchClaude(prompt, sessionId);

    // Exit code 0: Clean exit (includes user Ctrl+C which claude handles gracefully)
    // Should exit the dispatcher - user intentionally quit
    if (exitCode === 0) {
      log(`Claude exited cleanly (code ${exitCode}). Exiting dispatcher.`);
      process.exit(0);
    }

    // Exit code 143: SIGTERM (128 + 15), graceful termination signal
    // Continue the loop - stop hook sends SIGTERM when more issues need attention
    if (exitCode === 143) {
      log('Claude received SIGTERM (code 143). Continuing to next issue...');
      continue;
    }

    // Any other exit code is an error - pause before retry
    log(`Warning: Claude exited with error (code ${exitCode}). Pausing before retry...`);
    await sleep(5000);

    log('Restarting Claude...');
  }
}

// Run
main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  cleanup();
  process.exit(1);
});
