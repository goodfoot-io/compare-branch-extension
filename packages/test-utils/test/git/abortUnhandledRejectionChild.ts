/**
 * Child-process harness for the teardown unhandled-rejection regression test.
 *
 * Why: the regression must observe the *process-fatal* consequence of an
 * abort-induced unhandled rejection, which only manifests as a non-zero exit in
 * a real Node process running under the default `unhandledRejection` mode (the
 * same mode the extension test host uses). Asserting inside the same vitest
 * process is insufficient because all `unhandledRejection` listeners fire
 * regardless — only the crash distinguishes fixed from broken.
 *
 * Behavior: creates a real card repo, starts an abandoned (never-awaited,
 * no-catch) in-flight git operation against the helper's shared abort signal,
 * then calls `destroy()`. If `destroy()`'s guarded abort fails to contain the
 * rejection, Node terminates this process with a non-zero exit code; otherwise
 * the process drains cleanly and exits 0.
 *
 * @summary Reproduce a teardown abort unhandled rejection in an isolated process
 * @module test-utils/test/git/abortUnhandledRejectionChild
 */
import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { TestCardRepository } from '../../src/git/TestCardRepository.js';

async function main(): Promise<void> {
  const repo = new TestCardRepository();
  await repo.create();

  // Use getCardGit() directly (no createCard) so the in-flight client is bound
  // to the helper's shared abort signal — this is also the exact lifecycle that
  // leaves `this.git` null, the path finding 2 fixes. getCardGit() requires the
  // directory to exist, so create it first.
  const cardId = 'regression-card';
  await mkdir(path.join(repo.getPath(), cardId), { recursive: true });
  const git = repo.getCardGit(cardId);

  // Abandoned in-flight git work: an async wrapper whose returned promise is
  // never awaited and which has no catch. This mirrors a test that times out
  // mid-operation — exactly the path that turns abort() into an unhandled
  // rejection.
  async function abandoned(): Promise<void> {
    await git.raw(['log', '--format=%H']);
  }
  void abandoned();

  // Teardown while the operation is still in flight.
  repo.destroy();

  // Give the abort-induced rejection ample time to surface. If it escapes as an
  // unhandled rejection, the process will have already exited non-zero before
  // this resolves.
  await new Promise((resolve) => setTimeout(resolve, 750));
  process.exit(0);
}

void main();
