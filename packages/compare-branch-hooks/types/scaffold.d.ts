/**
 * Scaffold module for generating new Compare Branch hook projects.
 *
 * Generates a complete TypeScript project structure with:
 * - package.json with dependencies and scripts
 * - tsconfig.json with ESM/Node20 configuration
 * - biome.json for linting/formatting
 * - Hook template files for each requested hook type
 * - Vitest test files for each hook
 * - vitest.config.ts for test configuration
 * @module
 * @example
 * ```bash
 * npx @goodfoot/compare-branch-hooks --scaffold ./my-hooks --hooks StartIssue,EndIssue -o dist/hooks.json
 * ```
 */
/**
 * Options for scaffolding a new hook project.
 */
export interface ScaffoldOptions {
  /** Directory path where the project will be created. */
  directory: string;
  /** Array of hook event names to generate (e.g., ['StartIssue', 'EndIssue']). */
  hooks: string[];
  /** Relative path for hooks.json output in the build script. */
  outputPath: string;
}
/**
 * Scaffolds a new Compare Branch hook project.
 *
 * Creates the complete project structure including:
 * - package.json, tsconfig.json, biome.json, vitest.config.ts
 * - src/ directory with hook implementations
 * - test/ directory with vitest tests
 * @param options - Scaffold configuration options
 * @throws Exits with code 1 if directory exists or hook names are invalid
 * @example
 * ```typescript
 * scaffoldProject({
 *   directory: './my-hooks',
 *   hooks: ['StartIssue', 'EndIssue'],
 *   outputPath: 'dist/hooks.json'
 * });
 * ```
 */
export declare function scaffoldProject(options: ScaffoldOptions): void;
//# sourceMappingURL=scaffold.d.ts.map
