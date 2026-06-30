/**
 * Stop hook — merge nudge when workspace branch has unmerged commits.
 *
 * Fires at most once per session. Returns `decision: 'block'` with a `reason`
 * pointing the agent at `card/references/merge.md` when:
 * - The card is not tagged "blocked"
 * - Merge is either not gated or already approved
 * - The workspace branch has commits not yet merged into the base branch
 *
 * Under those conditions, the card-state contract says the work is ready to
 * merge — re-routing through `runtime:card` would push a finished card back
 * into validation/evaluation. The reason text offers `runtime:card` only as
 * an escape hatch for the agent that genuinely has more work to do.
 *
 * Fail-open: every error path returns `null`.
 *
 * Peer-hook interaction: both this hook and stop.ts (unattributed-commit
 * checker) are registered as two entries within ONE Stop hooks array entry in
 * hooks.json (the @goodfoot/claude-code-hooks build coalesces same-event,
 * matcher-less hooks into a single entry). Both can return `decision: 'block'`
 * on the same Stop event — Claude receives both reasons concatenated. The
 * route-nudge marker is written on the first fire and intentionally consumes
 * the once-per-session budget regardless of whether the sibling hook's reason
 * was the salient one. Cross-hook coordination is not possible because the
 * runtime does not expose peer-hook output to individual hooks.
 *
 * @summary Stop hook — route nudge for unmerged workspace branch commits
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getBaseBranch, getCardRepoPath, getWorkspaceBranch, getWorkspacePath } from '@cards/sdk/config';
import { hasSessionRouteNudgeFired, markSessionRouteNudgeFired } from '@cards/sessions/card-repo';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';
import { isSessionIdle } from '../../shared/session-idle.js';

interface CardMeta {
  tags?: string[];
  gates?: {
    mergeRequestRequired?: boolean;
    mergeApproved?: boolean;
  };
}

function readCardMeta(cardRepoPath: string): CardMeta {
  const raw = readFileSync(join(cardRepoPath, 'CARD.meta.json'), 'utf-8');
  return JSON.parse(raw) as CardMeta;
}

function getUnmergedCount(workspacePath: string, baseBranch: string, workspaceBranch: string): number {
  const output = execFileSync('git', ['rev-list', '--count', `${baseBranch}..${workspaceBranch}`], {
    cwd: workspacePath,
    encoding: 'utf-8',
    timeout: 5000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return parseInt(output.trim(), 10);
}

export default stopHook({}, async (input, { logger }) => {
  let cardRepoPath: string;
  let workspacePath: string;
  let baseBranch: string;
  let workspaceBranch: string;
  try {
    cardRepoPath = getCardRepoPath();
    workspacePath = getWorkspacePath();
    baseBranch = getBaseBranch();
    workspaceBranch = getWorkspaceBranch();
  } catch (error) {
    logger.warn('stop-route-nudge: not inside an action subprocess', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (!isSessionIdle(input.session_id)) {
    return null;
  }

  let nudgeFired: boolean;
  try {
    nudgeFired = hasSessionRouteNudgeFired(input.session_id);
  } catch (error) {
    logger.warn('stop-route-nudge: failed to check route-nudge marker', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (nudgeFired) {
    return null;
  }

  let meta: CardMeta;
  try {
    meta = readCardMeta(cardRepoPath);
  } catch (error) {
    logger.warn('stop-route-nudge: failed to read CARD.meta.json', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  const tags: string[] = Array.isArray(meta.tags) ? meta.tags : [];
  if (tags.includes('blocked')) {
    return null;
  }

  const mergeRequestRequired = meta.gates?.mergeRequestRequired === true;
  const mergeApproved = meta.gates?.mergeApproved === true;
  if (mergeRequestRequired && !mergeApproved) {
    return null;
  }

  let count: number;
  try {
    count = getUnmergedCount(workspacePath, baseBranch, workspaceBranch);
  } catch (error) {
    logger.warn('stop-route-nudge: git rev-list failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (count === 0) {
    return null;
  }

  try {
    markSessionRouteNudgeFired(input.session_id);
  } catch (error) {
    logger.error('stop-route-nudge: failed to write route-nudge marker', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  return stopOutput({
    decision: 'block',
    reason: [
      `Workspace branch \`${workspaceBranch}\` has ${count} commit(s) not merged into \`${baseBranch}\`. The card does not have a \`blocked\` tag, and merge is either ungated or already approved.`,
      '',
      'If validation and evaluation have passed and no scope remains, read `public/claude/runtime/skills/card/references/merge.md` and follow its `<instructions>` to merge.',
      '',
      'Otherwise, load the `runtime:card` skill and follow its `<routing-instructions>` to determine the next action — but do not re-run validation or evaluation just because this nudge fired.'
    ].join('\n')
  });
});
