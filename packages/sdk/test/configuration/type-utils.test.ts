/**
 * Tests for type utilities.
 *
 * These are primarily type-level tests using expectTypeOf to verify that
 * the SameShape utility catches typos and excess properties at compile time.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { SameShape } from '../../src/config/type-utils.js';

// ============================================================================
// Test Types
// ============================================================================

interface SimpleConfig {
  name: string;
  age: number;
}

interface ConfigWithOptional {
  actionName: string;
  timeout?: number;
}

interface NestedConfig {
  server: {
    host: string;
    port: number;
  };
  enabled: boolean;
}

// ============================================================================
// SameShape Type Tests
// ============================================================================

describe('SameShape', () => {
  describe('exact match scenarios', () => {
    it('should accept object with exact shape', () => {
      type Result = SameShape<SimpleConfig, { name: string; age: number }>;
      const value: Result = { name: 'Alice', age: 30 };

      expectTypeOf(value).toMatchTypeOf<{ name: string; age: number }>();
    });

    it('should accept object with optional property omitted', () => {
      type Result = SameShape<ConfigWithOptional, { actionName: string }>;
      const value: Result = { actionName: 'Launch' };

      expectTypeOf(value).toMatchTypeOf<ConfigWithOptional>();
    });

    it('should accept object with optional property included', () => {
      type Result = SameShape<ConfigWithOptional, { actionName: string; timeout: number }>;
      const value: Result = { actionName: 'Launch', timeout: 5000 };

      expectTypeOf(value).toMatchTypeOf<ConfigWithOptional>();
    });

    it('should work with nested objects', () => {
      type Result = SameShape<NestedConfig, { server: { host: string; port: number }; enabled: boolean }>;
      const value: Result = {
        server: { host: 'localhost', port: 3000 },
        enabled: true
      };

      expectTypeOf(value).toMatchTypeOf<NestedConfig>();
    });
  });

  describe('excess property detection', () => {
    it('should reject object with extra property', () => {
      // When an object has an extra property, that property gets typed as 'never'
      type WithExtra = { name: string; age: number; extra: string };
      type Result = SameShape<SimpleConfig, WithExtra>;

      // The 'extra' property should be typed as 'never'
      expectTypeOf<Result>().toHaveProperty('extra').toEqualTypeOf<never>();
    });

    it('should make typo properties become never', () => {
      // If someone has a typo, the misnamed property becomes 'never'
      type WithTypo = { actionName: string; actionNme: string };
      type ResultWithTypo = SameShape<ConfigWithOptional, WithTypo>;

      // The typo property should be never
      expectTypeOf<ResultWithTypo>().toHaveProperty('actionNme').toEqualTypeOf<never>();
    });

    it('should reject multiple extra properties', () => {
      type WithExtras = {
        name: string;
        age: number;
        extra1: string;
        extra2: number;
      };
      type Result = SameShape<SimpleConfig, WithExtras>;

      expectTypeOf<Result>().toHaveProperty('extra1').toEqualTypeOf<never>();
      expectTypeOf<Result>().toHaveProperty('extra2').toEqualTypeOf<never>();
    });
  });

  describe('required property enforcement', () => {
    it('should verify required properties are present', () => {
      // Types with all required properties should work
      type Complete = { name: string; age: number };
      type Result = SameShape<SimpleConfig, Complete>;

      expectTypeOf<Result>().toMatchTypeOf<SimpleConfig>();
    });

    it('should verify empty object works with all-optional interface', () => {
      interface AllOptional {
        foo?: string;
        bar?: number;
      }

      type Result = SameShape<AllOptional, Record<string, never>>;
      expectTypeOf<Result>().toMatchTypeOf<AllOptional>();
    });
  });

  describe('usage in factory functions', () => {
    it('should work with generic factory function', () => {
      // Simulate a factory function that uses SameShape
      function defineConfig<T extends ConfigWithOptional>(config: SameShape<ConfigWithOptional, T>): T {
        return config;
      }

      // Valid usage
      const valid = defineConfig({ actionName: 'Launch' });
      expectTypeOf(valid).toHaveProperty('actionName').toEqualTypeOf<string>();

      // Valid with optional
      const validWithOptional = defineConfig({
        actionName: 'Launch',
        timeout: 5000
      });
      expectTypeOf(validWithOptional).toHaveProperty('timeout').toEqualTypeOf<number>();
    });

    it('should preserve exact types in factory returns', () => {
      function defineConfig<T extends ConfigWithOptional>(config: SameShape<ConfigWithOptional, T>): T {
        return config;
      }

      // The return type should preserve the exact shape
      const result = defineConfig({ actionName: 'Launch', timeout: 5000 });
      expectTypeOf(result).toMatchTypeOf<{
        actionName: string;
        timeout: number;
      }>();
    });
  });

  describe('edge cases', () => {
    it('should work with empty interface', () => {
      type Empty = Record<string, never>;
      type Result = SameShape<Empty, Record<string, never>>;
      const value: Result = {};

      expectTypeOf(value).toMatchTypeOf<Record<string, never>>();
    });

    it('should work with interface that has only optional properties', () => {
      interface AllOptional {
        foo?: string;
        bar?: number;
      }

      type EmptyObject = Record<string, never>;
      type Result = SameShape<AllOptional, EmptyObject>;
      const empty: Result = {};
      expectTypeOf(empty).toMatchTypeOf<AllOptional>();

      type ResultWithProps = SameShape<AllOptional, { foo: string }>;
      const withProps: ResultWithProps = { foo: 'test' };
      expectTypeOf(withProps).toMatchTypeOf<AllOptional>();
    });

    it('should preserve literal types', () => {
      interface LiteralConfig {
        type: 'action' | 'command';
        value: string;
      }

      type Result = SameShape<LiteralConfig, { type: 'action'; value: string }>;
      const value: Result = { type: 'action', value: 'test' };

      expectTypeOf(value).toHaveProperty('type').toEqualTypeOf<'action'>();
    });

    it('should work with readonly properties', () => {
      interface ReadonlyConfig {
        readonly id: string;
        name: string;
      }

      type Result = SameShape<ReadonlyConfig, { id: string; name: string }>;
      const value: Result = { id: '123', name: 'Test' };

      expectTypeOf(value).toMatchTypeOf<ReadonlyConfig>();
    });
  });
});
