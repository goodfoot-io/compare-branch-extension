/**
 * Tests for TestStreamTransformHarness.
 *
 * Verifies the harness correctly loads StreamTransformModule code via dynamic
 * import and provides a simplified testing API with lifecycle management.
 *
 * @summary Tests for TestStreamTransformHarness
 */

import { afterEach, describe, expect, it } from 'vitest';
import { TestStreamTransformHarness } from '../../src/stream/TestStreamTransformHarness.js';

describe('TestStreamTransformHarness', () => {
  let harness: TestStreamTransformHarness;

  afterEach(async () => {
    if (harness) {
      await harness.stop();
    }
  });

  describe('start and transform', () => {
    it('should start with inline code and transform returns result', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          handler(line) { return \`processed: \${line}\`; }
        };
      `);

      const { result, error } = await harness.transform('test line');

      expect(result).toBe('processed: test line');
      expect(error).toBeUndefined();
    });

    it('should support async transforms', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          async handler(line) {
            await Promise.resolve();
            return \`async: \${line}\`;
          }
        };
      `);

      const { result, error } = await harness.transform('test');

      expect(result).toBe('async: test');
      expect(error).toBeUndefined();
    });

    it('should support state persistence between transforms', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          init(ctx) { ctx.state.set('count', 0); },
          handler(line, ctx) {
            const count = ctx.state.get('count') + 1;
            ctx.state.set('count', count);
            return \`[\${count}] \${line}\`;
          }
        };
      `);

      const r1 = await harness.transform('first');
      const r2 = await harness.transform('second');
      const r3 = await harness.transform('third');

      expect(r1.result).toBe('[1] first');
      expect(r2.result).toBe('[2] second');
      expect(r3.result).toBe('[3] third');
    });

    it('should return original line with error on transform failure (fail-open)', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          handler(line) { throw new Error('Transform failed'); }
        };
      `);

      const { result, error } = await harness.transform('original');

      expect(result).toBe('original');
      expect(error).toBe('Transform failed');
    });

    it('should call init before first transform', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          init(ctx) { ctx.state.set('initialized', true); },
          handler(line, ctx) {
            return ctx.state.get('initialized') ? \`ready: \${line}\` : \`not-ready: \${line}\`;
          }
        };
      `);

      const { result } = await harness.transform('test');
      expect(result).toBe('ready: test');
    });
  });

  describe('stop', () => {
    it('should reject transforms after stop', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          handler(line) { return line; }
        };
      `);

      await harness.stop();

      await expect(harness.transform('test')).rejects.toThrow('Harness not started');
    });
  });

  describe('isStarted', () => {
    it('should return false before start', () => {
      harness = new TestStreamTransformHarness();
      expect(harness.isStarted).toBe(false);
    });

    it('should return true after start', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          handler(line) { return line; }
        };
      `);

      expect(harness.isStarted).toBe(true);
    });

    it('should return false after stop', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default {
          streamType: 'test',
          handler(line) { return line; }
        };
      `);

      await harness.stop();

      expect(harness.isStarted).toBe(false);
    });
  });
});
