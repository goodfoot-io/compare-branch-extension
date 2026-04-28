/**
 * Copies a stream renderer's wwwRoot directory into the build output.
 *
 * Consumers are responsible for pre-bundling their own wwwRoot (e.g. with
 * `Bun.build` and `bun-plugin-tailwind`) before running the SDK build. This
 * module simply mirrors the wwwRoot contents into the output directory after
 * verifying the entrypoint exists.
 *
 * @summary Copies a wwwRoot directory into the build output
 * @module cli/www-bundler
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Copies a wwwRoot directory to the output directory.
 *
 * @param wwwRootDir - Absolute path to the source wwwRoot directory.
 * @param outputDir - Absolute path to the output directory.
 * @param entrypoint - HTML entrypoint filename within wwwRootDir (defaults to `"index.html"`).
 * @throws Error if the entrypoint file does not exist.
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

  fs.mkdirSync(outputDir, { recursive: true });
  copyDirSync(wwwRootDir, outputDir);
}

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
