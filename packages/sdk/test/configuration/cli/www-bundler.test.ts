/**
 * Tests for the wwwRoot HTML bundler.
 *
 * Verifies that inline `<script type="module">` content in HTML files is
 * bundled via esbuild, resolving bare module specifiers into self-contained
 * inline JavaScript.
 *
 * @summary Tests for wwwRoot HTML bundler
 * @module
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bundleWwwHtml, processWwwRoot } from '../../../src/config/cli/www-bundler.js';

const FIXTURES_DIR = '/tmp/cards-sdk-www-bundler-test-fixtures';

beforeAll(() => {
  mkdirSync(FIXTURES_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
});

describe('bundleWwwHtml', () => {
  it('should bundle inline module script that imports a local module', async () => {
    const testDir = join(FIXTURES_DIR, 'local-import');
    mkdirSync(testDir, { recursive: true });

    // Create a local module that the HTML script imports
    writeFileSync(join(testDir, 'helpers.js'), `export function greet(name) { return 'Hello, ' + name; }\n`);

    // Create HTML with an inline module script importing the local module
    const htmlPath = join(testDir, 'index.html');
    writeFileSync(
      htmlPath,
      `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <script type="module">
    import { greet } from './helpers.js';
    document.body.textContent = greet('World');
  </script>
</body>
</html>`
    );

    const result = await bundleWwwHtml(htmlPath, testDir);

    // The bundled output should contain the inlined greet function
    expect(result.html).toContain('Hello, ');
    // The bare import should be resolved — no more import statement for helpers
    expect(result.html).not.toContain("from './helpers.js'");
    // Should still be valid HTML structure
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<script type="module">');
    expect(result.html).toContain('</script>');
  });

  it('should return HTML unchanged when no inline module scripts exist', async () => {
    const testDir = join(FIXTURES_DIR, 'no-module');
    mkdirSync(testDir, { recursive: true });

    const html = `<!DOCTYPE html>
<html>
<head><title>Static</title></head>
<body>
  <script>console.log('not a module');</script>
</body>
</html>`;

    const htmlPath = join(testDir, 'index.html');
    writeFileSync(htmlPath, html);

    const result = await bundleWwwHtml(htmlPath, testDir);
    expect(result.html).toBe(html);
  });

  it('should return HTML unchanged when module script tag is empty', async () => {
    const testDir = join(FIXTURES_DIR, 'empty-module');
    mkdirSync(testDir, { recursive: true });

    const html = `<!DOCTYPE html>
<html>
<body>
  <script type="module"></script>
</body>
</html>`;

    const htmlPath = join(testDir, 'index.html');
    writeFileSync(htmlPath, html);

    const result = await bundleWwwHtml(htmlPath, testDir);
    expect(result.html).toBe(html);
  });

  it('should preserve external script src tags', async () => {
    const testDir = join(FIXTURES_DIR, 'external-script');
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'lib.js'), `export const VERSION = '1.0';\n`);

    const htmlPath = join(testDir, 'index.html');
    writeFileSync(
      htmlPath,
      `<!DOCTYPE html>
<html>
<body>
  <script src="https://cdn.example.com/lib.js"></script>
  <script type="module">
    import { VERSION } from './lib.js';
    console.log(VERSION);
  </script>
</body>
</html>`
    );

    const result = await bundleWwwHtml(htmlPath, testDir);

    // External script tag should be preserved exactly
    expect(result.html).toContain('<script src="https://cdn.example.com/lib.js"></script>');
    // Inline module should be bundled
    expect(result.html).not.toContain("from './lib.js'");
    expect(result.html).toContain('1.0');
  });

  it('should bundle multiple inline module scripts independently', async () => {
    const testDir = join(FIXTURES_DIR, 'multi-script');
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'a.js'), `export const A = 'alpha';\n`);
    writeFileSync(join(testDir, 'b.js'), `export const B = 'beta';\n`);

    const htmlPath = join(testDir, 'index.html');
    writeFileSync(
      htmlPath,
      `<!DOCTYPE html>
<html>
<body>
  <script type="module">
    import { A } from './a.js';
    console.log(A);
  </script>
  <script type="module">
    import { B } from './b.js';
    console.log(B);
  </script>
</body>
</html>`
    );

    const result = await bundleWwwHtml(htmlPath, testDir);

    expect(result.html).toContain('alpha');
    expect(result.html).toContain('beta');
    expect(result.html).not.toContain("from './a.js'");
    expect(result.html).not.toContain("from './b.js'");
  });

  it('should throw on unresolvable imports', async () => {
    const testDir = join(FIXTURES_DIR, 'bad-import');
    mkdirSync(testDir, { recursive: true });

    const htmlPath = join(testDir, 'index.html');
    writeFileSync(
      htmlPath,
      `<!DOCTYPE html>
<html>
<body>
  <script type="module">
    import { nonexistent } from './does-not-exist.js';
    console.log(nonexistent);
  </script>
</body>
</html>`
    );

    await expect(bundleWwwHtml(htmlPath, testDir)).rejects.toThrow(/Could not resolve/);
  });

  it('should preserve CSS and other non-script content', async () => {
    const testDir = join(FIXTURES_DIR, 'with-css');
    mkdirSync(testDir, { recursive: true });

    writeFileSync(join(testDir, 'util.js'), `export const x = 42;\n`);

    const htmlPath = join(testDir, 'index.html');
    writeFileSync(
      htmlPath,
      `<!DOCTYPE html>
<html>
<head>
  <style>
    body { color: red; }
    .test { margin: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { x } from './util.js';
    document.getElementById('root').textContent = String(x);
  </script>
</body>
</html>`
    );

    const result = await bundleWwwHtml(htmlPath, testDir);

    expect(result.html).toContain('body { color: red; }');
    expect(result.html).toContain('.test { margin: 0; }');
    expect(result.html).toContain('<div id="root"></div>');
    expect(result.html).toContain('42');
  });
});

describe('processWwwRoot', () => {
  it('should copy files and bundle HTML entrypoint to output directory', async () => {
    const testDir = join(FIXTURES_DIR, 'process-test');
    const srcDir = join(testDir, 'www');
    const outDir = join(testDir, 'output');
    mkdirSync(srcDir, { recursive: true });

    writeFileSync(join(srcDir, 'helper.js'), `export const val = 'bundled';\n`);
    writeFileSync(join(srcDir, 'style.css'), `body { margin: 0; }\n`);
    writeFileSync(
      join(srcDir, 'index.html'),
      `<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="style.css"></head>
<body>
  <script type="module">
    import { val } from './helper.js';
    console.log(val);
  </script>
</body>
</html>`
    );

    await processWwwRoot(srcDir, outDir);

    // Output HTML should have bundled script
    const outputHtml = readFileSync(join(outDir, 'index.html'), 'utf-8');
    expect(outputHtml).toContain('bundled');
    expect(outputHtml).not.toContain("from './helper.js'");

    // Static assets should be copied
    const css = readFileSync(join(outDir, 'style.css'), 'utf-8');
    expect(css).toContain('body { margin: 0; }');

    // The original JS file should also be copied (even though it's bundled into HTML)
    expect(readFileSync(join(outDir, 'helper.js'), 'utf-8')).toContain('bundled');
  });

  it('should support custom entrypoint filename', async () => {
    const testDir = join(FIXTURES_DIR, 'custom-entry');
    const srcDir = join(testDir, 'www');
    const outDir = join(testDir, 'output');
    mkdirSync(srcDir, { recursive: true });

    writeFileSync(join(srcDir, 'mod.js'), `export const greeting = 'hi';\n`);
    writeFileSync(
      join(srcDir, 'app.html'),
      `<!DOCTYPE html>
<html>
<body>
  <script type="module">
    import { greeting } from './mod.js';
    console.log(greeting);
  </script>
</body>
</html>`
    );

    await processWwwRoot(srcDir, outDir, 'app.html');

    const outputHtml = readFileSync(join(outDir, 'app.html'), 'utf-8');
    expect(outputHtml).toContain('hi');
    expect(outputHtml).not.toContain("from './mod.js'");
  });

  it('should throw when entrypoint does not exist', async () => {
    const testDir = join(FIXTURES_DIR, 'missing-entry');
    const srcDir = join(testDir, 'www');
    const outDir = join(testDir, 'output');
    mkdirSync(srcDir, { recursive: true });

    await expect(processWwwRoot(srcDir, outDir)).rejects.toThrow('wwwRoot entrypoint not found');
  });
});
