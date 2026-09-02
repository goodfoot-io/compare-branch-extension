/**
 * Build manifest types for scripts/build.mjs.
 *
 * Provides type declarations so TypeScript callers (e.g. tests) can import
 * EXECUTABLE and targets without a ts-runner or compilation step.
 */

export interface BuildTarget {
  /** Unique target name, e.g. 'claude-core'. */
  name: string;
  /** Agent selector for the CLI's --agent flag ('claude-code' or 'codex'). */
  agent: string;
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
}

/** Absolute path to the resolved `@goodfoot/agent-hooks` CLI entry (`dist/cli.js`). */
export declare const agentHooksCli: string;

/** The VSCODE_NODE executable wrapper stamped into every hooks.json command. */
export declare const EXECUTABLE: string;

/** The six build targets in build order. */
export declare const targets: BuildTarget[];

/** One Antigravity build target. */
export interface AntigravityBuildTarget {
  /** Unique target name, e.g. 'antigravity-runtime'. */
  name: string;
  /** Input glob relative to the package root. */
  input: string;
  /** Output plugin-root directory relative to the package root. */
  outBase: string;
}

/** One pinned `runtime/hooks.json` registration. */
export interface AntigravityHookRegistration {
  /** Host event name, e.g. 'PreInvocation'. */
  event: string;
  /** Handler file name under `bin/`, relative to the hooks.json root. */
  handler: string;
}

/** The Antigravity build target in build order. */
export declare const antigravityTargets: AntigravityBuildTarget[];

/** The pinned hooks.json registration matrix (three events, bounded timeouts). */
export declare const ANTIGRAVITY_HOOK_REGISTRATIONS: AntigravityHookRegistration[];

/** The hook name the host registers the three runtime event entries under. */
export declare const ANTIGRAVITY_HOOK_NAME: string;

/** Bounded explicit timeout (seconds) stamped into every registration. */
export declare const ANTIGRAVITY_HOOK_TIMEOUT_SECONDS: number;

/** Builds the exact `runtime/hooks.json` document value (named hooks schema). */
export declare function antigravityHooksJson(): Record<
  string,
  Record<string, Array<{ type: string; command: string; timeout: number }>>
>;

/** Builds one Antigravity target (bin/ bundles + generated hooks.json). */
export declare function buildAntigravityTarget(target: AntigravityBuildTarget): Promise<void>;
