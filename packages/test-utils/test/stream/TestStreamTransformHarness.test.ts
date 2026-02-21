/**
 * Tests for TestStreamTransformHarness.
 *
 * These tests verify the harness correctly wraps StreamTransformWorkerPool
 * with a simplified testing API including log capture and lifecycle management.
 *
 * @summary Tests for TestStreamTransformHarness
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createStreamInitContext, TestStreamTransformHarness } from '../../src/stream/TestStreamTransformHarness.js';

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
        export default function transform(line) {
          return \`processed: \${line}\`;
        }
      `);

      const { result, error } = await harness.transform('test line');

      expect(result).toBe('processed: test line');
      expect(error).toBeUndefined();
    });

    it('should support async transforms', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default async function transform(line) {
          await Promise.resolve();
          return \`async: \${line}\`;
        }
      `);

      const { result, error } = await harness.transform('test');

      expect(result).toBe('async: test');
      expect(error).toBeUndefined();
    });

    it('should support state persistence between transforms', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export function init(ctx) {
          ctx.state.set('count', 0);
        }

        export default function transform(line, ctx) {
          const count = ctx.state.get('count') + 1;
          ctx.state.set('count', count);
          return \`[\${count}] \${line}\`;
        }
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
        export default function transform(line) {
          throw new Error('Transform failed');
        }
      `);

      const { result, error } = await harness.transform('original');

      expect(result).toBe('original');
      expect(error).toBe('Transform failed');
    });

    it('should capture console logs from transforms', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default function transform(line) {
          console.log('Processing:', line);
          console.warn('Warning message');
          console.error('Error message');
          return line;
        }
      `);

      await harness.transform('test');

      const logs = harness.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0]).toEqual({ level: 'info', args: ['Processing:', 'test'] });
      expect(logs[1]).toEqual({ level: 'warn', args: ['Warning message'] });
      expect(logs[2]).toEqual({ level: 'error', args: ['Error message'] });
    });

    it('should auto-increment lineNumber when not provided', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default function transform(line, ctx) {
          return \`line \${ctx.lineNumber}: \${line}\`;
        }
      `);

      const r1 = await harness.transform('first');
      const r2 = await harness.transform('second');
      const r3 = await harness.transform('third', 100); // explicit lineNumber (doesn't affect counter)
      const r4 = await harness.transform('fourth'); // continues from counter (was at 2, now 3)

      expect(r1.result).toBe('line 1: first');
      expect(r2.result).toBe('line 2: second');
      expect(r3.result).toBe('line 100: third');
      expect(r4.result).toBe('line 3: fourth');
    });

    it('should pass init context to transform init function', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(
        `
        export function init(ctx) {
          ctx.state.set('cardId', ctx.card.id);
          ctx.state.set('streamType', ctx.streamType);
        }

        export default function transform(line, ctx) {
          const cardId = ctx.state.get('cardId');
          const streamType = ctx.state.get('streamType');
          return \`[\${cardId}:\${streamType}] \${line}\`;
        }
      `,
        {
          card: { id: 'my-card', metadata: { foo: 'bar' } },
          streamType: 'custom-type'
        }
      );

      const { result } = await harness.transform('test');

      expect(result).toBe('[my-card:custom-type] test');
    });
  });

  describe('stop', () => {
    it('should terminate worker on stop', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default function transform(line) {
          return line;
        }
      `);

      await harness.stop();

      // Subsequent transform should fail
      await expect(harness.transform('test')).rejects.toThrow('Harness not started');
    });
  });

  describe('clearLogs', () => {
    it('should clear captured logs', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default function transform(line) {
          console.log('message');
          return line;
        }
      `);

      await harness.transform('test');
      expect(harness.getLogs()).toHaveLength(1);

      harness.clearLogs();
      expect(harness.getLogs()).toHaveLength(0);
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
        export default function transform(line) {
          return line;
        }
      `);

      expect(harness.isStarted).toBe(true);
    });

    it('should return false after stop', async () => {
      harness = new TestStreamTransformHarness();
      await harness.start(`
        export default function transform(line) {
          return line;
        }
      `);

      await harness.stop();

      expect(harness.isStarted).toBe(false);
    });
  });
});

describe('createStreamInitContext', () => {
  it('should create context with defaults', () => {
    const ctx = createStreamInitContext();

    expect(ctx.streamType).toBe('test-stream');
    expect(ctx.filename).toBe('test.log');
    expect(ctx.headers).toEqual({});
    expect(ctx.card).toEqual({ id: 'test-card-id', metadata: {} });
  });

  it('should allow partial overrides for card', () => {
    const ctx = createStreamInitContext({
      card: { id: 'custom-id', title: 'Custom Title', metadata: { key: 'value' } }
    });

    expect(ctx.card).toEqual({ id: 'custom-id', title: 'Custom Title', metadata: { key: 'value' } });
    expect(ctx.streamType).toBe('test-stream'); // default preserved
  });

  it('should allow partial overrides for headers', () => {
    const ctx = createStreamInitContext({
      headers: { 'Content-Type': 'application/json' }
    });

    expect(ctx.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('should allow overrides for streamType and filename', () => {
    const ctx = createStreamInitContext({
      streamType: 'custom-stream',
      filename: 'custom.log'
    });

    expect(ctx.streamType).toBe('custom-stream');
    expect(ctx.filename).toBe('custom.log');
  });
});
