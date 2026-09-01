/**
 * React entry point for the antigravity-session stream renderer.
 *
 * Mounts `<App />` into the `#stream-root` element. The App component reads
 * the host-controlled stream-store mode and renders
 * `<AntigravityCompactView />` or `<AntigravityExpandedView />` accordingly —
 * never routing Antigravity through a sibling host's component.
 *
 * Also applies the `mode-*` class on `<body>` whenever the mode changes so
 * that any external CSS relying on that class continues to work, mirroring
 * the claude-code-session and codex-session entry points.
 *
 * @summary React SPA entry point for antigravity-session stream rendering
 */

import { streamStore } from '@cards.management/sdk/stream-store';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AntigravityCompactView } from './components/compact/AntigravityCompactView';
import { AntigravityExpandedView } from './components/expanded/AntigravityExpandedView';
import { useStreamStore } from './hooks/useStreamStore';

/**
 * Applies the appropriate mode class to document.body.
 * @param mode - The stream store mode string (`compact` or `expanded`).
 */
function applyBodyClass(mode: string): void {
  document.body.className = `mode-${mode}`;
}

/**
 * Root component that switches between compact and expanded views based on
 * the host-controlled stream store mode.
 * @returns The active view component for the iframe context.
 */
function App(): React.ReactElement {
  const mode = useStreamStore((s) => s.mode);
  return mode === 'compact' ? <AntigravityCompactView /> : <AntigravityExpandedView />;
}

// Apply initial body mode class.
applyBodyClass(streamStore.getState().mode);

// Keep body class in sync with store mode changes.
streamStore.subscribe((state) => {
  applyBodyClass(state.mode);
});

// Mount the React SPA into #stream-root. App handles mode switching internally.
const rootEl = document.getElementById('stream-root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
