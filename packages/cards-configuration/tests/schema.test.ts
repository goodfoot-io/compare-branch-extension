/**
 * Type-level tests for schema types.
 *
 * These tests verify that the schema types enforce correct structure
 * for settings.json using TypeScript's type system.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { Action, Command, Environment, Settings, StreamDefinition, TypeDefinition } from '../src/schema.js';

// ============================================================================
// Command Tests
// ============================================================================

describe('Command', () => {
  it('should require command property', () => {
    expectTypeOf<Command>().toMatchTypeOf<{ command: string }>();
  });

  it('should allow command property as string', () => {
    const cmd: Command = { command: 'node ./bin/test.js' };
    expectTypeOf(cmd.command).toBeString();
  });

  it('should allow optional timeout property', () => {
    const cmdWithTimeout: Command = {
      command: 'node ./bin/test.js',
      timeout: 30000
    };
    expectTypeOf(cmdWithTimeout.timeout).toEqualTypeOf<number | undefined>();
  });

  it('should allow omitting timeout property', () => {
    const cmdWithoutTimeout: Command = { command: 'node ./bin/test.js' };
    expectTypeOf(cmdWithoutTimeout).toMatchTypeOf<Command>();
  });
});

// ============================================================================
// Action Tests
// ============================================================================

describe('Action', () => {
  it('should require name and command properties', () => {
    expectTypeOf<Action>().toMatchTypeOf<{
      name: string;
      command: Command;
    }>();
  });

  it('should allow minimal action with only required fields', () => {
    const minimalAction: Action = {
      name: 'Test Action',
      command: { command: 'node ./bin/test.js' }
    };
    expectTypeOf(minimalAction).toMatchTypeOf<Action>();
  });

  it('should allow optional id property', () => {
    const actionWithId: Action = {
      id: 'test-action',
      name: 'Test Action',
      command: { command: 'node ./bin/test.js' }
    };
    expectTypeOf(actionWithId.id).toEqualTypeOf<string | undefined>();
  });

  it('should allow optional description property', () => {
    const actionWithDescription: Action = {
      name: 'Test Action',
      description: 'A test action',
      command: { command: 'node ./bin/test.js' }
    };
    expectTypeOf(actionWithDescription.description).toEqualTypeOf<string | undefined>();
  });

  it('should allow optional icon property', () => {
    const actionWithIcon: Action = {
      name: 'Test Action',
      icon: 'rocket',
      command: { command: 'node ./bin/test.js' }
    };
    expectTypeOf(actionWithIcon.icon).toEqualTypeOf<string | undefined>();
  });

  it('should allow optional supportsBackgroundMode property', () => {
    const actionWithBackground: Action = {
      name: 'Test Action',
      command: { command: 'node ./bin/test.js' },
      supportsBackgroundMode: true
    };
    expectTypeOf(actionWithBackground.supportsBackgroundMode).toEqualTypeOf<boolean | undefined>();
  });

  it('should allow optional allowConcurrent property', () => {
    const actionWithConcurrent: Action = {
      name: 'Test Action',
      command: { command: 'node ./bin/test.js' },
      allowConcurrent: false
    };
    expectTypeOf(actionWithConcurrent.allowConcurrent).toEqualTypeOf<boolean | undefined>();
  });

  it('should allow all properties together', () => {
    const fullAction: Action = {
      id: 'test-action',
      name: 'Test Action',
      description: 'A test action',
      icon: 'rocket',
      command: { command: 'node ./bin/test.js', timeout: 30000 },
      supportsBackgroundMode: true,
      allowConcurrent: false
    };
    expectTypeOf(fullAction).toMatchTypeOf<Action>();
  });
});

// ============================================================================
// TypeDefinition Tests
// ============================================================================

describe('TypeDefinition', () => {
  it('should require version property', () => {
    expectTypeOf<TypeDefinition>().toMatchTypeOf<{ version: string }>();
  });

  it('should allow minimal type definition with only version', () => {
    const minimalType: TypeDefinition = {
      version: '1.0.0'
    };
    expectTypeOf(minimalType).toMatchTypeOf<TypeDefinition>();
  });

  it('should allow optional validator command', () => {
    const typeWithValidator: TypeDefinition = {
      version: '1.0.0',
      validator: { command: 'node ./bin/validator.js' }
    };
    expectTypeOf(typeWithValidator.validator).toEqualTypeOf<Command | undefined>();
  });

  it('should allow optional create command', () => {
    const typeWithCreate: TypeDefinition = {
      version: '1.0.0',
      create: { command: 'node ./bin/create.js' }
    };
    expectTypeOf(typeWithCreate.create).toEqualTypeOf<Command | undefined>();
  });

  it('should allow optional update command', () => {
    const typeWithUpdate: TypeDefinition = {
      version: '1.0.0',
      update: { command: 'node ./bin/update.js' }
    };
    expectTypeOf(typeWithUpdate.update).toEqualTypeOf<Command | undefined>();
  });

  it('should allow optional delete command', () => {
    const typeWithDelete: TypeDefinition = {
      version: '1.0.0',
      delete: { command: 'node ./bin/delete.js' }
    };
    expectTypeOf(typeWithDelete.delete).toEqualTypeOf<Command | undefined>();
  });

  it('should allow all lifecycle commands together', () => {
    const fullType: TypeDefinition = {
      version: '1.0.0',
      validator: { command: 'node ./bin/validator.js' },
      create: { command: 'node ./bin/create.js' },
      update: { command: 'node ./bin/update.js' },
      delete: { command: 'node ./bin/delete.js' }
    };
    expectTypeOf(fullType).toMatchTypeOf<TypeDefinition>();
  });
});

// ============================================================================
// StreamDefinition Tests
// ============================================================================

describe('StreamDefinition', () => {
  it('should require version and transform properties', () => {
    expectTypeOf<StreamDefinition>().toMatchTypeOf<{
      version: number;
      transform: { path: string; timeout?: number };
    }>();
  });

  it('should require version to be a number', () => {
    const streamDef: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js' }
    };
    expectTypeOf(streamDef.version).toBeNumber();
  });

  it('should require transform.path to be a string', () => {
    const streamDef: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js' }
    };
    expectTypeOf(streamDef.transform.path).toBeString();
  });

  it('should allow minimal stream definition with only required fields', () => {
    const minimalStream: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js' }
    };
    expectTypeOf(minimalStream).toMatchTypeOf<StreamDefinition>();
  });

  it('should allow optional timeout in transform', () => {
    const streamWithTimeout: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js', timeout: 5000 }
    };
    expectTypeOf(streamWithTimeout.transform.timeout).toEqualTypeOf<number | undefined>();
  });

  it('should allow optional maxLineLength property', () => {
    const streamWithMaxLine: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js' },
      maxLineLength: 1024
    };
    expectTypeOf(streamWithMaxLine.maxLineLength).toEqualTypeOf<number | undefined>();
  });

  it('should allow optional maxStreamSize property', () => {
    const streamWithMaxSize: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js' },
      maxStreamSize: 1048576
    };
    expectTypeOf(streamWithMaxSize.maxStreamSize).toEqualTypeOf<number | undefined>();
  });

  it('should allow all properties together', () => {
    const fullStream: StreamDefinition = {
      version: 1,
      transform: { path: './bin/transform.js', timeout: 5000 },
      maxLineLength: 1024,
      maxStreamSize: 1048576
    };
    expectTypeOf(fullStream).toMatchTypeOf<StreamDefinition>();
  });
});

// ============================================================================
// Environment Tests
// ============================================================================

describe('Environment', () => {
  it('should require version and actions properties', () => {
    expectTypeOf<Environment>().toMatchTypeOf<{
      version: number;
      actions: Action[];
    }>();
  });

  it('should allow minimal environment with only required fields', () => {
    const minimalEnv: Environment = {
      version: 1,
      actions: []
    };
    expectTypeOf(minimalEnv).toMatchTypeOf<Environment>();
  });

  it('should require actions to be an array', () => {
    const env: Environment = {
      version: 1,
      actions: [
        {
          name: 'Test',
          command: { command: 'node ./bin/test.js' }
        }
      ]
    };
    expectTypeOf(env.actions).toEqualTypeOf<Action[]>();
  });

  it('should allow optional description property', () => {
    const envWithDescription: Environment = {
      version: 1,
      description: 'Test environment',
      actions: []
    };
    expectTypeOf(envWithDescription.description).toEqualTypeOf<string | undefined>();
  });

  it('should allow optional types property', () => {
    const envWithTypes: Environment = {
      version: 1,
      actions: [],
      types: {
        note: { version: '1.0.0' }
      }
    };
    expectTypeOf(envWithTypes.types).toEqualTypeOf<Record<string, TypeDefinition> | undefined>();
  });

  it('should allow types to be a record of TypeDefinitions', () => {
    const env: Environment = {
      version: 1,
      actions: [],
      types: {
        note: { version: '1.0.0' },
        task: { version: '2.0.0' }
      }
    };
    if (env.types) {
      expectTypeOf(env.types.note).toMatchTypeOf<TypeDefinition>();
      expectTypeOf(env.types.task).toMatchTypeOf<TypeDefinition>();
    }
  });

  it('should allow optional streams property', () => {
    const envWithStreams: Environment = {
      version: 1,
      actions: [],
      streams: {
        logs: {
          version: 1,
          transform: { path: './bin/transform-logs.js' }
        }
      }
    };
    expectTypeOf(envWithStreams.streams).toEqualTypeOf<Record<string, StreamDefinition> | undefined>();
  });

  it('should allow streams to be a record of StreamDefinitions', () => {
    const env: Environment = {
      version: 1,
      actions: [],
      streams: {
        logs: {
          version: 1,
          transform: { path: './bin/transform-logs.js' }
        },
        metrics: {
          version: 1,
          transform: { path: './bin/transform-metrics.js' }
        }
      }
    };
    if (env.streams) {
      expectTypeOf(env.streams.logs).toMatchTypeOf<StreamDefinition>();
      expectTypeOf(env.streams.metrics).toMatchTypeOf<StreamDefinition>();
    }
  });

  it('should allow all properties together', () => {
    const fullEnv: Environment = {
      version: 1,
      description: 'Full environment',
      actions: [
        {
          name: 'Test Action',
          command: { command: 'node ./bin/test.js' }
        }
      ],
      types: {
        note: {
          version: '1.0.0',
          validator: { command: 'node ./bin/validator.js' }
        }
      },
      streams: {
        logs: {
          version: 1,
          transform: { path: './bin/transform-logs.js', timeout: 5000 },
          maxLineLength: 1024,
          maxStreamSize: 1048576
        }
      }
    };
    expectTypeOf(fullEnv).toMatchTypeOf<Environment>();
  });
});

// ============================================================================
// Settings Tests
// ============================================================================

describe('Settings', () => {
  it('should require environments property', () => {
    expectTypeOf<Settings>().toMatchTypeOf<{
      environments: Record<string, Environment>;
    }>();
  });

  it('should allow environments to be a record of Environments', () => {
    const settings: Settings = {
      environments: {
        default: {
          version: 1,
          actions: []
        }
      }
    };
    expectTypeOf(settings.environments).toEqualTypeOf<Record<string, Environment>>();
  });

  it('should allow multiple environments', () => {
    const settings: Settings = {
      environments: {
        default: {
          version: 1,
          actions: []
        },
        production: {
          version: 1,
          actions: []
        }
      }
    };
    expectTypeOf(settings.environments.default).toMatchTypeOf<Environment>();
    expectTypeOf(settings.environments.production).toMatchTypeOf<Environment>();
  });

  it('should allow complex nested structure', () => {
    const settings: Settings = {
      environments: {
        default: {
          version: 1,
          description: 'Default environment',
          actions: [
            {
              id: 'launch',
              name: 'Launch Claude',
              description: 'Launch Claude in a new window',
              icon: 'rocket',
              command: { command: 'node ./bin/launch.js', timeout: 30000 },
              supportsBackgroundMode: true,
              allowConcurrent: false
            }
          ],
          types: {
            note: {
              version: '1.0.0',
              validator: { command: 'node ./bin/note-validator.js' },
              create: { command: 'node ./bin/note-create.js' },
              update: { command: 'node ./bin/note-update.js' },
              delete: { command: 'node ./bin/note-delete.js' }
            }
          }
        }
      }
    };
    expectTypeOf(settings).toMatchTypeOf<Settings>();
  });
});
