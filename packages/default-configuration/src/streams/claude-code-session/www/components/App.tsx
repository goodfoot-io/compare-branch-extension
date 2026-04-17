/**
 * Root application component for the claude-code-session stream renderer.
 *
 * Reads the current display mode from the stream store and renders the
 * appropriate view (compact or expanded).
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
 * @returns The active view component for the iframe context.
 */
export function App(): React.ReactElement {
  const mode = useStreamStore((s) => s.mode);

  return mode === 'compact' ? <CompactView /> : <ExpandedView />;
}
