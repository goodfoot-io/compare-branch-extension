/**
 * Build manifest types for scripts/build.mjs.
 *
 * Provides type declarations so TypeScript callers (e.g. tests) can import
 * EXECUTABLE and targets without a ts-runner or compilation step.
 */

export interface BuildTarget {
  /** Unique target name, e.g. 'claude-core'. */
  name: string;
  /** Hook CLI bin name ('claude-code-hooks' or 'codex-hooks'). */
  cli: string;
  /** Input glob relative to the package root. */
  input: string;
  /** Output base directory relative to the package root. */
  outBase: string;
  /** Output hooks.json path relative to the package root. */
  output: string;
  /** Output subdirectories to clean before compiling. */
  clean: string[];
  /** Extra --loader flags (empty array when none). */
  loaders: string[];
  /** --log-env-var value, or null for targets that don't use it. */
  logEnvVar: string | null;
  /** True only for the claude-runtime target (triggers MCP server bundle). */
  mcpServer?: boolean;
}

/** The VSCODE_NODE executable wrapper stamped into every hooks.json command. */
export declare const EXECUTABLE: string;

/** The five build targets in build order. */
export declare const targets: BuildTarget[];
