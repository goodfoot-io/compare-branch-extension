/**
 * VS Code theme kind synchronization hook for the stream renderer.
 *
 * Follows the pattern from cards-detail/hooks/useThemeAttribute.ts. Updates
 * `data-vscode-theme-kind` on `<html>` when theme changes so Tailwind
 * dark-mode variants and CSS variables resolve correctly.
 *
 * @summary Hook that syncs VS Code theme kind to a document attribute
 * @module hooks/useThemeAttribute
 */

import { useEffect } from 'react';

/** Maps protocol theme kind values to CSS attribute values. */
const THEME_MAP = {
  1: 'light',
  2: 'dark',
  3: 'high-contrast'
} as const;

/**
 * Updates `data-vscode-theme-kind` on `document.documentElement` whenever
 * the theme kind changes.
 * @param themeKind - VS Code theme kind (1=Light, 2=Dark, 3=HighContrast)
 */
export function useThemeAttribute(themeKind: 1 | 2 | 3): void {
  useEffect(() => {
    document.documentElement.setAttribute('data-vscode-theme-kind', THEME_MAP[themeKind]);
  }, [themeKind]);
}
