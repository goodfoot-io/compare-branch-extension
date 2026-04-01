/**
 * End-to-end tests for stream configuration serialization.
 *
 * These tests validate that:
 * 1. Stream configurations serialize correctly to settings.json format
 * 2. Multiple streams can coexist in an environment
 * 3. Streams work alongside actions and types
 * 4. Optional stream fields serialize correctly
 *
 *
 * @summary End-to-end tests for stream configuration serialization
 * @module
 */

import { describe, expect, it } from 'vitest';
import { defineAction, type SettingsConfig, type StreamDefinition, serializeSettings } from '../../src/index.js';

// ============================================================================
// Stream Configuration Serialization Tests
// ============================================================================

describe('stream configuration serialization', () => {
  describe('basic serialization', () => {
    it('should serialize stream config with required fields to settings.json format', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'my-stream': {
                version: 1,
                wwwRoot: './renderers/my-stream'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['my-stream'];

      expect(streamDef).toBeDefined();
      expect(streamDef?.version).toBe(1);
      expect(streamDef?.wwwRoot).toBe('./renderers/my-stream');
      expect(streamDef?.entrypoint).toBeUndefined();
      expect(streamDef?.maxLineLength).toBeUndefined();
      expect(streamDef?.maxStreamSize).toBeUndefined();
    });

    it('should serialize stream config with all optional fields', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'my-stream': {
                version: 1,
                wwwRoot: './renderers/my-stream',
                entrypoint: 'app.html',
                maxLineLength: 1024,
                maxStreamSize: 1048576
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['my-stream'];

      expect(streamDef).toBeDefined();
      expect(streamDef?.version).toBe(1);
      expect(streamDef?.wwwRoot).toBe('./renderers/my-stream');
      expect(streamDef?.entrypoint).toBe('app.html');
      expect(streamDef?.maxLineLength).toBe(1024);
      expect(streamDef?.maxStreamSize).toBe(1048576);
    });

    it('should serialize wwwRoot as provided path', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'custom-stream': {
                version: 1,
                wwwRoot: './custom/renderer/path'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['custom-stream'];

      expect(streamDef?.wwwRoot).toBe('./custom/renderer/path');
    });

    it('should serialize version as number', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'versioned-stream': {
                version: 2,
                wwwRoot: './renderers/versioned'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['versioned-stream'];

      expect(typeof streamDef?.version).toBe('number');
      expect(streamDef?.version).toBe(2);
    });
  });

  describe('multiple streams', () => {
    it('should serialize multiple streams in the same environment', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                wwwRoot: './renderers/jsonl'
              },
              'csv-stream': {
                version: 1,
                wwwRoot: './renderers/csv'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streams = settings.environments['default']!.streams;

      expect(streams).toBeDefined();
      expect(Object.keys(streams!)).toHaveLength(2);
      expect(streams!['jsonl-stream']).toBeDefined();
      expect(streams!['csv-stream']).toBeDefined();
      expect(streams!['jsonl-stream']!.wwwRoot).toBe('./renderers/jsonl');
      expect(streams!['csv-stream']!.wwwRoot).toBe('./renderers/csv');
    });

    it('should serialize streams with different configurations', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'fast-stream': {
                version: 1,
                wwwRoot: './renderers/fast',
                maxLineLength: 512
              },
              'slow-stream': {
                version: 1,
                wwwRoot: './renderers/slow',
                maxLineLength: 2048,
                maxStreamSize: 10485760
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const fastStream = settings.environments['default']!.streams?.['fast-stream'];
      const slowStream = settings.environments['default']!.streams?.['slow-stream'];

      expect(fastStream?.maxLineLength).toBe(512);
      expect(fastStream?.maxStreamSize).toBeUndefined();
      expect(slowStream?.maxLineLength).toBe(2048);
      expect(slowStream?.maxStreamSize).toBe(10485760);
    });
  });

  describe('streams with actions and types', () => {
    it('should serialize streams alongside actions', () => {
      const actionCommand = defineAction({ actionName: 'test-action' }, async () => {
        // Action implementation
      });

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand],
            streams: {
              'test-stream': {
                version: 1,
                wwwRoot: './renderers/test'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const env = settings.environments['default']!;

      expect(env.actions).toHaveLength(1);
      expect(env.streams).toBeDefined();
      expect(env.streams?.['test-stream']).toBeDefined();
      expect(env.actions[0]!.name).toBe('test-action');
      expect(env.streams?.['test-stream']!.wwwRoot).toBe('./renderers/test');
    });

    it('should serialize full config with actions and streams', () => {
      const actionCommand = defineAction({ actionName: 'test-action' }, async () => {
        // Action implementation
      });

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand],
            streams: {
              'test-stream': {
                version: 1,
                wwwRoot: './renderers/test'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const env = settings.environments['default']!;

      expect(env.version).toBe(1);
      expect(env.actions).toHaveLength(1);
      expect(env.streams).toBeDefined();
      expect(Object.keys(env.streams!)).toHaveLength(1);
    });
  });

  describe('StreamDefinition format compliance', () => {
    it('should match StreamDefinition interface structure', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'compliant-stream': {
                version: 1,
                wwwRoot: './renderers/compliant',
                entrypoint: 'app.html',
                maxLineLength: 512,
                maxStreamSize: 524288
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef: StreamDefinition | undefined = settings.environments['default']!.streams?.['compliant-stream'];

      // Verify all StreamDefinition fields
      expect(streamDef).toBeDefined();
      expect(streamDef).toHaveProperty('version');
      expect(streamDef).toHaveProperty('wwwRoot');

      // Verify types
      expect(typeof streamDef?.version).toBe('number');
      expect(typeof streamDef?.wwwRoot).toBe('string');
      expect(typeof streamDef?.entrypoint).toBe('string');
      expect(typeof streamDef?.maxLineLength).toBe('number');
      expect(typeof streamDef?.maxStreamSize).toBe('number');

      // Verify optional fields are present when configured
      expect(streamDef?.entrypoint).toBe('app.html');
      expect(streamDef?.maxLineLength).toBe(512);
      expect(streamDef?.maxStreamSize).toBe(524288);
    });

    it('should omit undefined optional fields', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'minimal-stream': {
                version: 1,
                wwwRoot: './renderers/minimal'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['minimal-stream'];

      // Should not have optional fields when not configured
      expect(streamDef).toBeDefined();
      expect('entrypoint' in (streamDef ?? {})).toBe(false);
      expect('maxLineLength' in (streamDef ?? {})).toBe(false);
      expect('maxStreamSize' in (streamDef ?? {})).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty streams object', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {}
          }
        }
      };

      const settings = serializeSettings(config);
      const streams = settings.environments['default']!.streams;

      expect(streams).toBeDefined();
      expect(Object.keys(streams!)).toHaveLength(0);
    });

    it('should handle missing streams property', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: []
          }
        }
      };

      const settings = serializeSettings(config);
      const streams = settings.environments['default']!.streams;

      expect(streams).toBeUndefined();
    });

    it('should handle stream name with special characters', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'my-special_stream.v2': {
                version: 1,
                wwwRoot: './renderers/special'
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['my-special_stream.v2'];

      expect(streamDef).toBeDefined();
      expect(streamDef?.version).toBe(1);
    });

    it('should handle large size constraint values', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'large-stream': {
                version: 1,
                wwwRoot: './renderers/large',
                maxLineLength: 1048576, // 1MB per line
                maxStreamSize: 104857600 // 100MB total
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['large-stream'];

      expect(streamDef?.maxLineLength).toBe(1048576);
      expect(streamDef?.maxStreamSize).toBe(104857600);
    });
  });
});
