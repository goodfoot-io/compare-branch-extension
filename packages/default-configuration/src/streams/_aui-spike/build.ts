/**
 * Bun build script for the throwaway assistant-ui integration spike.
 *
 * Mirrors `claude-code-session/www/build.ts` but without the Tailwind plugin
 * (the spike uses plain CSS only, deliberately avoiding @assistant-ui/react-ui
 * and shadcn).
 *
 * @summary Bun HTML bundler entry point for the assistant-ui spike SPA
 */

export {};

const result = await Bun.build({
  entrypoints: ['./src/streams/_aui-spike/index.html'],
  outdir: './dist/www/_aui-spike',
  minify: true,
  target: 'browser',
  compile: true
});

if (!result.success) {
  console.error('Build failed:', result.logs);
  process.exit(1);
}
