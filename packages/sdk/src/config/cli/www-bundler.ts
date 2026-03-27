/**
 * Bundles inline `<script type="module">` content in HTML files using esbuild.
 *
 * When a wwwRoot directory contains an HTML entrypoint with inline module
 * scripts that use bare module specifiers (e.g., `@cards/sdk/stream-store`),
 * those imports cannot resolve in a sandboxed iframe's opaque origin. This
 * module extracts each inline module script, bundles it with esbuild so all
 * dependencies are resolved and inlined, then replaces the original script
 * content with the bundled output.
 *
 * @summary Bundles inline module scripts in HTML entrypoints for iframe srcdoc
 * @module cli/www-bundler
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as esbuild from 'esbuild';

/**
 * Result of bundling a wwwRoot HTML entrypoint.
 */
export interface BundleWwwResult {
  /** The processed HTML with bundled inline scripts. */
  html: string;
}

/**
 * Regex matching `<script type="module">...content...</script>` blocks.
 *
 * Captures two groups:
 * 1. The opening tag (e.g., `<script type="module">`)
 * 2. The inline script content between the tags
 *
 * Uses the `s` (dotAll) flag so `.` matches newlines within the script body.
 * Uses a non-greedy quantifier to avoid spanning across multiple script tags.
 */
const INLINE_MODULE_SCRIPT_RE = /(<script\s+type="module"\s*>)([\s\S]*?)(<\/script>)/gi;

/**
 * Bundles inline `<script type="module">` content within an HTML file.
 *
 * For each inline module script found in the HTML:
 * 1. Extracts the script content
 * 2. Feeds it to esbuild as a virtual entry with the wwwRoot as resolveDir
 * 3. Replaces the original content with the bundled output
 *
 * External `<script src="...">` tags are left untouched. Only inline
 * `<script type="module">` blocks are processed.
 *
 * @param htmlPath - Absolute path to the HTML entrypoint file.
 * @param wwwRootDir - Absolute path to the wwwRoot directory, used as the
 *   resolve directory for bare module specifiers.
 * @returns The HTML with all inline module scripts bundled.
 * @throws Error if esbuild bundling fails for any script block.
 */
export async function bundleWwwHtml(htmlPath: string, wwwRootDir: string): Promise<BundleWwwResult> {
  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Collect all inline module script matches
  const matches: Array<{ fullMatch: string; openTag: string; content: string; closeTag: string }> = [];

  for (const match of html.matchAll(INLINE_MODULE_SCRIPT_RE)) {
    const openTag = match[1];
    const rawContent = match[2];
    const closeTag = match[3];
    if (!openTag || !rawContent || !closeTag) continue;

    const content = rawContent.trim();
    if (content.length > 0) {
      matches.push({
        fullMatch: match[0],
        openTag,
        content,
        closeTag
      });
    }
  }

  if (matches.length === 0) {
    // No inline module scripts to bundle — return as-is
    return { html };
  }

  let result = html;

  for (const { fullMatch, openTag, content, closeTag } of matches) {
    const bundled = await bundleInlineScript(content, wwwRootDir);
    result = result.replace(fullMatch, `${openTag}\n${bundled}\n  ${closeTag}`);
  }

  return { html: result };
}

/**
 * Bundles a single inline script's content using esbuild.
 *
 * Uses esbuild's stdin API to feed the script content as a virtual entry
 * point, resolving imports relative to the wwwRoot directory. The output
 * is a self-contained ESM bundle with all dependencies inlined.
 *
 * @param scriptContent - The raw JavaScript/TypeScript content from an inline script tag.
 * @param resolveDir - Directory used to resolve bare and relative imports.
 * @returns The bundled JavaScript as a string.
 * @throws Error if esbuild encounters build errors.
 */
async function bundleInlineScript(scriptContent: string, resolveDir: string): Promise<string> {
  const buildResult = await esbuild.build({
    stdin: {
      contents: scriptContent,
      resolveDir,
      sourcefile: 'inline-module.js',
      loader: 'js'
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    minify: false,
    minifyWhitespace: true,
    treeShaking: true,
    logLevel: 'silent'
  });

  if (buildResult.errors.length > 0) {
    const errors = buildResult.errors.map((e) => e.text).join('\n');
    throw new Error(`Failed to bundle inline module script: ${errors}`);
  }

  const output = buildResult.outputFiles[0];
  if (!output) {
    throw new Error('esbuild produced no output for inline module script');
  }
  return output.text;
}

/**
 * Processes a wwwRoot directory by bundling the entrypoint HTML and copying
 * it (plus any other static assets) to the output directory.
 *
 * @param wwwRootDir - Absolute path to the source wwwRoot directory.
 * @param outputDir - Absolute path to the output directory.
 * @param entrypoint - HTML entrypoint filename within wwwRootDir (defaults to `"index.html"`).
 * @returns The relative path from the build output root to the processed wwwRoot directory.
 * @throws Error if the entrypoint file does not exist or bundling fails.
 */
export async function processWwwRoot(
  wwwRootDir: string,
  outputDir: string,
  entrypoint: string = 'index.html'
): Promise<void> {
  const entrypointPath = path.resolve(wwwRootDir, entrypoint);

  if (!fs.existsSync(entrypointPath)) {
    throw new Error(`wwwRoot entrypoint not found: ${entrypointPath}`);
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Copy all files from wwwRoot to output first
  copyDirSync(wwwRootDir, outputDir);

  // Then bundle the entrypoint HTML, overwriting the copied version
  const { html } = await bundleWwwHtml(entrypointPath, wwwRootDir);
  fs.writeFileSync(path.join(outputDir, entrypoint), html, 'utf-8');
}

/**
 * Recursively copies a directory's contents to a destination.
 *
 * @param src - Source directory path.
 * @param dest - Destination directory path (created if it does not exist).
 */
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
