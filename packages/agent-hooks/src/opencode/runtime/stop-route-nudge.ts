/**
 * OpenCode plugin entry: merge route nudge (notify-only).
 *
 * On `event`/`session.idle` for a root card session with unmerged workspace
 * commits, announces the merge runbook through the log channels. OpenCode
 * plugins cannot block a turn, so this is a named notify-only degradation of
 * the Codex `decision: block` hook. See the factory for behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary Stop route nudge equivalent for OpenCode (runtime plugin)
 * @module runtime/stop-route-nudge
 */

import type { Plugin } from '@opencode-ai/plugin';
import {
  createInertRuntimePlugin,
  createStopRouteNudgePlugin,
  isCardsActionSession
} from '../internal/runtime-handlers.js';

/** Merge route-nudge plugin bound to the real dependency wiring. */
// Inert outside Cards-action sessions: without `CARD_ID` the lifecycle hooks
// would only idle; exporting no hooks keeps accidental registrations silent.
export const CardsStopRouteNudge: Plugin = isCardsActionSession()
  ? createStopRouteNudgePlugin()
  : createInertRuntimePlugin();
