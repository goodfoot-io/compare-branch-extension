/**
 * Root application component for the claude-code-session stream renderer.
 *
 * Reads the current display mode from the stream store and renders the
 * appropriate view (compact or expanded). Mode switching causes the relevant
 * view to unmount/remount so it rebuilds from the current store lines.
 *
 * Also syncs the VS Code theme kind attribute on mount for theme-aware styling.
 *
 * @summary Root App component: mode switch → CompactView or ExpandedView
 * @module components/App
 */

import type React from 'react';
import { useStreamStore } from '../hooks/useStreamStore';
import { CompactView } from './compact/CompactView';
import { ExpandedView } from './expanded/ExpandedView';

/**
 * Root component that switches between compact and expanded views based on
 * the stream store mode.
 * @returns The active view component, or null when mode is 'closed'.
 */
export function App(): React.ReactElement | null {
  const mode = useStreamStore((s) => s.mode);

  if (mode === 'compact' || mode === 'hidden') {
    return <CompactView />;
  }

  if (mode === 'expanded') {
    return <ExpandedView />;
  }

  // 'closed' — render nothing
  return null;
}
