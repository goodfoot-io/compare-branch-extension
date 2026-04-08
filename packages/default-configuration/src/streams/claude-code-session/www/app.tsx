/**
 * React entry point for the claude-code-session stream renderer.
 *
 * Mounts React roots for compact and expanded display modes, calls
 * `observeHeight()` for iframe auto-sizing, and subscribes to `streamStore`
 * for live updates. Phase 2 will implement full component rendering.
 *
 * @summary React SPA entry point for claude-code-session stream rendering
 */

import { observeHeight, streamStore } from '@cards/sdk/stream-store';
import { createRoot } from 'react-dom/client';

observeHeight();

// Subscribe to store changes — Phase 2 will implement full rendering logic here
streamStore.subscribe(() => {
  // placeholder
});

const compactEl = document.getElementById('compact-root');
const expandedEl = document.getElementById('expanded-root');

if (compactEl) {
  createRoot(compactEl).render(<div className="text-vscode-foreground" />);
}

if (expandedEl) {
  createRoot(expandedEl).render(<div className="text-vscode-foreground" />);
}
