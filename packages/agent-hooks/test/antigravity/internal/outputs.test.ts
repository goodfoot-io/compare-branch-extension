/**
 * Tests for the Antigravity output builders' pinned JSON contract.
 *
 * @summary Tests for the Antigravity hook output contract
 */

import { describe, expect, it } from 'vitest';
import { postInvocationOutput, preInvocationOutput, stopOutput } from '../../../src/antigravity/internal/outputs.js';

describe('preInvocationOutput', () => {
  it('emits exactly the empty object (no message fields)', () => {
    expect(preInvocationOutput()).toEqual({});
    expect(Object.keys(preInvocationOutput())).toEqual([]);
    expect(JSON.parse(JSON.stringify(preInvocationOutput()))).toEqual({});
  });
});

describe('postInvocationOutput', () => {
  it('emits the exact injectSteps shape when a step is required', () => {
    const output = postInvocationOutput({ injectSteps: [{ ephemeralMessage: 'next step' }] });
    expect(output).toEqual({ injectSteps: [{ ephemeralMessage: 'next step' }] });
    expect(JSON.parse(JSON.stringify(output))).toEqual({ injectSteps: [{ ephemeralMessage: 'next step' }] });
  });

  it('emits the empty object when no step is required', () => {
    expect(postInvocationOutput()).toEqual({});
    expect(postInvocationOutput({})).toEqual({});
    expect(Object.keys(postInvocationOutput())).toEqual([]);
  });

  it('emits no reserved decision fields the host could misread', () => {
    const json = JSON.stringify(postInvocationOutput({ injectSteps: [{ ephemeralMessage: 'x' }] }));
    expect(json).not.toContain('"continue"');
    expect(json).not.toContain('"decision"');
  });
});

describe('stopOutput', () => {
  it('emits exactly the empty object', () => {
    expect(stopOutput()).toEqual({});
    expect(Object.keys(stopOutput())).toEqual([]);
  });

  it('never carries a continue decision', () => {
    const json = JSON.stringify(stopOutput());
    expect(json).not.toContain('continue');
    expect(json).not.toContain('decision');
  });
});
