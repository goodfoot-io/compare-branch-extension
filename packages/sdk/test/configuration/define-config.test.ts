/**
 * Tests for the defineConfig function.
 *
 * These tests verify that defineConfig provides IDE intellisense (identity
 * function) for `settings.config.ts` authors.
 *
 * @summary Tests for the defineConfig function
 */

import { describe, expect, it, vi } from 'vitest';
import type { ActionCommand } from '../../src/config/command-types.js';
import type { SettingsConfig } from '../../src/config/config.js';
import { defineConfig } from '../../src/config/define-config.js';

// ============================================================================
// defineConfig Tests
// ============================================================================

describe('defineConfig', () => {
  it('should return the same config object (identity function)', () => {
    const config: SettingsConfig = {
      environments: {
        default: {
          version: 1,
          actions: []
        }
      }
    };

    const result = defineConfig(config);

    expect(result).toBe(config);
  });

  it('should not modify the config object', () => {
    const config: SettingsConfig = {
      environments: {
        default: {
          version: 1,
          description: 'Test environment',
          actions: []
        }
      }
    };

    const result = defineConfig(config);

    expect(result).toEqual(config);
    expect(result.environments['default']!.description).toBe('Test environment');
  });

  it('should work with complex config objects', () => {
    const mockCommand = vi.fn() as unknown as ActionCommand;
    mockCommand.factoryType = 'action';
    mockCommand.actionName = 'Test';

    const config: SettingsConfig = {
      environments: {
        default: {
          version: 1,
          actions: [mockCommand]
        },
        production: {
          version: 2,
          actions: []
        }
      }
    };

    const result = defineConfig(config);

    expect(result).toBe(config);
  });
});
