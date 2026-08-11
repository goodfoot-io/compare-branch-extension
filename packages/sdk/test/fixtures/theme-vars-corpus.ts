/**
 * Shared theme-variable corpus for the webview ↔ server parity contract.
 *
 * Modeled on the webview's [vscodeVars.test.ts](./packages/cards/web/test/utils/vscodeVars.test.ts)
 * shape lists: every safe value shape the webview asserts (`#1e1e1e`,
 * `rgba(…)`, `13px`, `0`, `normal`, quoted font stacks,
 * font-feature-settings) and every hostile shape it asserts (`</style>`
 * raw-text terminations, braces, semicolons, comments, unbalanced parens,
 * `url()`, hostile content inside balanced quotes). Each entry carries the
 * verdict the shared filter must give it — the SDK's
 * [vars-parity.test.ts](./public/packages/sdk/test/protocol/types/vars-parity.test.ts)
 * pins the filter against the corpus, and the server's `?vars=` bake
 * validation (Phase C) must accept exactly the `safe: true` entries.
 *
 * Not a `*.test.ts` file so the corpus can be exported for the cross-package
 * parity test without tripping the no-exports-in-test rule.
 *
 * @summary Shared theme-variable corpus with expected filter verdicts
 * @module test/fixtures/theme-vars-corpus
 */

/**
 * One theme-variable entry: the custom-property key, the value shape, and the
 * verdict the filter must give it.
 */
export interface ThemeVarCorpusEntry {
  /** Custom-property key (`--name` syntax). */
  key: string;
  /** The value shape as VS Code would inject it. */
  value: string;
  /** Whether the shared filter must accept it. */
  safe: boolean;
}

/** The shared corpus. */
export const THEME_VARS_CORPUS: readonly ThemeVarCorpusEntry[] = [
  // ── Safe shapes ──
  { key: '--vscode-foreground', value: '#1e1e1e', safe: true },
  { key: '--vscode-activityBar-foreground', value: '#fff', safe: true },
  { key: '--vscode-editor-background', value: '#1e1e1eff', safe: true },
  { key: '--vscode-editor-selection-background', value: 'rgba(0, 0, 0, .5)', safe: true },
  { key: '--vscode-focusBorder', value: 'hsl(210, 50%, 40%)', safe: true },
  { key: '--vscode-editor-font-size', value: '13px', safe: true },
  { key: '--vscode-editor-line-height', value: '1.5em', safe: true },
  { key: '--vscode-editor-letter-spacing', value: '-2px', safe: true },
  { key: '--vscode-font-weight', value: '0', safe: true },
  { key: '--vscode-font-style', value: 'normal', safe: true },
  { key: '--vscode-font-family', value: 'sans-serif', safe: true },
  { key: '--vscode-font-family', value: '"Cascadia Code", Consolas, monospace', safe: true },
  { key: '--vscode-font-family', value: '-apple-system, BlinkMacSystemFont, sans-serif', safe: true },
  { key: '--vscode-font-feature-settings', value: '"liga" off, "calt" off', safe: true },
  // ── Hostile shapes ──
  { key: '--vscode-unknown', value: 'red }', safe: false },
  { key: '--vscode-unknown', value: '#fff; color: red', safe: false },
  { key: '--vscode-unknown', value: '</style>', safe: false },
  { key: '--vscode-unknown', value: 'red\\', safe: false },
  { key: '--vscode-unknown', value: '/* x */ red', safe: false },
  { key: '--vscode-unknown', value: 'rgb(0, 0, 0', safe: false },
  { key: '--vscode-unknown', value: ')(0, 0, 0)', safe: false },
  { key: '--vscode-unknown', value: 'url(https://evil.tld/p.png)', safe: false },
  { key: '--vscode-unknown', value: '"</style><script src=https://evil.tld/p.js></script>"', safe: false },
  { key: '--vscode-unknown', value: '#1e1e1e }', safe: false }
];
