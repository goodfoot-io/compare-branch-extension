/**
 * React entry point for the claude-code-session stream renderer.
 *
 * Mounts `<App />` into the `#compact-root` element. The App component reads
 * the stream store mode and renders `<CompactView />` or `<ExpandedView />`
 * accordingly.
 *
 * Also applies the `mode-*` class on `<body>` whenever the mode changes so
 * that any external CSS relying on that class continues to work.
 *
 * @summary React SPA entry point for claude-code-session stream rendering
 */

import { streamStore } from '@cards/sdk/stream-store';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

/**
 * Applies the appropriate mode class to document.body.
 * @param mode - The stream store mode string (`compact` or `expanded`).
 */
function applyBodyClass(mode: string): void {
  document.body.className = `mode-${mode}`;
}

// Apply initial body mode class
applyBodyClass(streamStore.getState().mode);

// Keep body class in sync with store mode changes
streamStore.subscribe((state) => {
  applyBodyClass(state.mode);
});

// Mount the React SPA into #compact-root. App handles mode switching internally.
const rootEl = document.getElementById('compact-root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
