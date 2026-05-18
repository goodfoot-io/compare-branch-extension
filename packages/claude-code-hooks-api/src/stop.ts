/**
 * Stop hook — no-op.
 *
 * The hook's only previous job was PID-registry cleanup, which no longer
 * exists. It is retained as a no-op so hook configuration that references
 * this entry continues to resolve.
 *
 *
 * @summary Stop hook (no-op)
 * @module stop
 */

import { stopHook } from '@goodfoot/claude-code-hooks';

export default stopHook({}, async (_input, _ctx) => {
  return null;
});
