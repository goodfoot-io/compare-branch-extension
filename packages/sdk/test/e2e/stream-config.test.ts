/**
 * End-to-end tests for stream configuration serialization.
 *
 * These tests validate that:
 * 1. Stream configurations serialize correctly to settings.json format
 * 2. Stream transform handlers receive correct context
 * 3. Multiple streams can coexist in an environment
 * 4. Streams work alongside actions and types
 * 5. Optional stream fields serialize correctly
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { TransformContext } from '../../src/config/command-types.js';
import {
  defineAction,
  defineStreamTransform,
  defineTypeValidator,
  type SettingsConfig,
  type StreamDefinition,
  serializeSettings,
  validationSuccess
} from '../../src/index.js';

// ============================================================================
// Stream Configuration Serialization Tests
// ============================================================================

describe('stream configuration serialization', () => {
  describe('basic serialization', () => {
    it('should serialize stream config with required fields to settings.json format', () => {
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'my-stream': {
                version: 1,
                transform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['my-stream'];

      expect(streamDef).toBeDefined();
      expect(streamDef?.version).toBe(1);
      expect(streamDef?.transform.path).toBe('streamTransform-jsonl.js');
      expect(streamDef?.transform.timeout).toBeUndefined();
      expect(streamDef?.maxLineLength).toBeUndefined();
      expect(streamDef?.maxStreamSize).toBeUndefined();
    });

    it('should serialize stream config with all optional fields', () => {
      const transform = defineStreamTransform(
        {
          streamType: 'jsonl',
          timeout: 5000,
          maxLineLength: 1024,
          maxStreamSize: 1048576
        },
        async (line: string) => line
      );

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'my-stream': {
                version: 1,
                transform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['my-stream'];

      expect(streamDef).toBeDefined();
      expect(streamDef?.version).toBe(1);
      expect(streamDef?.transform.path).toBe('streamTransform-jsonl.js');
      expect(streamDef?.transform.timeout).toBe(5000);
      expect(streamDef?.maxLineLength).toBe(1024);
      expect(streamDef?.maxStreamSize).toBe(1048576);
    });

    it('should serialize transform.path following streamTransform-{streamType}.js pattern', () => {
      const customTransform = defineStreamTransform({ streamType: 'custom-format' }, async (line: string) => line);

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'custom-stream': {
                version: 1,
                transform: customTransform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['custom-stream'];

      expect(streamDef?.transform.path).toBe('streamTransform-custom-format.js');
    });

    it('should serialize version as number', () => {
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'versioned-stream': {
                version: 2,
                transform
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
      const jsonlTransform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const csvTransform = defineStreamTransform({ streamType: 'csv' }, async (line: string) => line);

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: jsonlTransform
              },
              'csv-stream': {
                version: 1,
                transform: csvTransform
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
      expect(streams!['jsonl-stream']!.transform.path).toBe('streamTransform-jsonl.js');
      expect(streams!['csv-stream']!.transform.path).toBe('streamTransform-csv.js');
    });

    it('should serialize streams with different configurations', () => {
      const fastTransform = defineStreamTransform({ streamType: 'fast', timeout: 1000 }, async (line: string) => line);

      const slowTransform = defineStreamTransform(
        { streamType: 'slow', timeout: 10000, maxLineLength: 2048 },
        async (line: string) => line
      );

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'fast-stream': {
                version: 1,
                transform: fastTransform
              },
              'slow-stream': {
                version: 1,
                transform: slowTransform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const fastStream = settings.environments['default']!.streams?.['fast-stream'];
      const slowStream = settings.environments['default']!.streams?.['slow-stream'];

      expect(fastStream?.transform.timeout).toBe(1000);
      expect(fastStream?.maxLineLength).toBeUndefined();
      expect(slowStream?.transform.timeout).toBe(10000);
      expect(slowStream?.maxLineLength).toBe(2048);
    });
  });

  describe('streams with actions and types', () => {
    it('should serialize streams alongside actions', () => {
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

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
                transform
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
      expect(env.streams?.['test-stream']!.transform.path).toBe('streamTransform-jsonl.js');
    });

    it('should serialize streams alongside types', () => {
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const validator = defineTypeValidator({ typeName: 'note' }, async () => validationSuccess());

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              note: {
                version: '1.0.0',
                validator
              }
            },
            streams: {
              'test-stream': {
                version: 1,
                transform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const env = settings.environments['default']!;

      expect(env.types).toBeDefined();
      expect(env.types?.['note']).toBeDefined();
      expect(env.streams).toBeDefined();
      expect(env.streams?.['test-stream']).toBeDefined();
      expect(env.streams?.['test-stream']!.transform.path).toBe('streamTransform-jsonl.js');
    });

    it('should serialize full config with actions, types, and streams', () => {
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const actionCommand = defineAction({ actionName: 'test-action' }, async () => {
        // Action implementation
      });

      const validator = defineTypeValidator({ typeName: 'note' }, async () => validationSuccess());

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand],
            types: {
              note: {
                version: '1.0.0',
                validator
              }
            },
            streams: {
              'test-stream': {
                version: 1,
                transform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const env = settings.environments['default']!;

      expect(env.version).toBe(1);
      expect(env.actions).toHaveLength(1);
      expect(env.types).toBeDefined();
      expect(env.streams).toBeDefined();
      expect(Object.keys(env.streams!)).toHaveLength(1);
    });
  });

  describe('transform context', () => {
    it('should pass correct context to transform handler', async () => {
      let capturedContext: TransformContext | undefined;

      const transform = defineStreamTransform(
        { streamType: 'jsonl' },
        async (line: string, context: TransformContext) => {
          capturedContext = context;
          return line;
        }
      );

      // Execute the transform to verify context
      const testContext: TransformContext = {
        lineNumber: 42,
        streamType: 'jsonl',
        state: new Map()
      };

      await transform('test line', testContext);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.lineNumber).toBe(42);
      expect(capturedContext?.streamType).toBe('jsonl');
    });

    it('should preserve streamType in transform command', () => {
      const transform = defineStreamTransform({ streamType: 'custom-type' }, async (line: string) => line);

      expect(transform.streamType).toBe('custom-type');
    });

    it('should pass line number through context', async () => {
      const lineNumbers: number[] = [];

      const transform = defineStreamTransform(
        { streamType: 'jsonl' },
        async (line: string, context: TransformContext) => {
          lineNumbers.push(context.lineNumber);
          return line;
        }
      );

      // Simulate processing multiple lines
      const state = new Map();
      await transform('line 1', { lineNumber: 1, streamType: 'jsonl', state });
      await transform('line 2', { lineNumber: 2, streamType: 'jsonl', state });
      await transform('line 3', { lineNumber: 3, streamType: 'jsonl', state });

      expect(lineNumbers).toEqual([1, 2, 3]);
    });
  });

  describe('StreamDefinition format compliance', () => {
    it('should match StreamDefinition interface structure', () => {
      const transform = defineStreamTransform(
        {
          streamType: 'jsonl',
          timeout: 3000,
          maxLineLength: 512,
          maxStreamSize: 524288
        },
        async (line: string) => line
      );

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'compliant-stream': {
                version: 1,
                transform
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
      expect(streamDef).toHaveProperty('transform');
      expect(streamDef?.transform).toHaveProperty('path');

      // Verify types
      expect(typeof streamDef?.version).toBe('number');
      expect(typeof streamDef?.transform.path).toBe('string');
      expect(typeof streamDef?.transform.timeout).toBe('number');
      expect(typeof streamDef?.maxLineLength).toBe('number');
      expect(typeof streamDef?.maxStreamSize).toBe('number');

      // Verify optional fields are present when configured
      expect(streamDef?.transform.timeout).toBe(3000);
      expect(streamDef?.maxLineLength).toBe(512);
      expect(streamDef?.maxStreamSize).toBe(524288);
    });

    it('should omit undefined optional fields', () => {
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'minimal-stream': {
                version: 1,
                transform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['minimal-stream'];

      // Should not have optional fields when not configured
      expect(streamDef).toBeDefined();
      expect('timeout' in (streamDef?.transform ?? {})).toBe(false);
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
      const transform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'my-special_stream.v2': {
                version: 1,
                transform
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

    it('should handle large timeout values', () => {
      const transform = defineStreamTransform(
        { streamType: 'jsonl', timeout: 300000 }, // 5 minutes
        async (line: string) => line
      );

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'slow-stream': {
                version: 1,
                transform
              }
            }
          }
        }
      };

      const settings = serializeSettings(config);
      const streamDef = settings.environments['default']!.streams?.['slow-stream'];

      expect(streamDef?.transform.timeout).toBe(300000);
    });

    it('should handle large size constraint values', () => {
      const transform = defineStreamTransform(
        {
          streamType: 'jsonl',
          maxLineLength: 1048576, // 1MB per line
          maxStreamSize: 104857600 // 100MB total
        },
        async (line: string) => line
      );

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'large-stream': {
                version: 1,
                transform
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
