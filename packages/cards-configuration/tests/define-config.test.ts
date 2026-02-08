/**
 * Tests for defineConfig and serializeSettings functions.
 *
 * These tests verify that defineConfig provides IDE intellisense (identity function)
 * and that serializeSettings correctly transforms config with command objects
 * into settings.json-compatible schema.
 */

import { describe, expect, it, vi } from 'vitest';
import type {
  ActionCommand,
  StreamTransformCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from '../src/command-types.js';
import type { SettingsConfig } from '../src/config.js';
import { defineConfig, serializeSettings } from '../src/define-config.js';

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
    expect(result.environments.default.description).toBe('Test environment');
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

// ============================================================================
// serializeSettings Tests
// ============================================================================

describe('serializeSettings', () => {
  describe('action metadata extraction', () => {
    it('should extract actionName as name', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Launch Claude';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].name).toBe('Launch Claude');
    });

    it('should extract description from action command', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Deploy';
      actionCommand.description = 'Deploy to production';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].description).toBe('Deploy to production');
    });

    it('should extract icon from action command', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Launch';
      actionCommand.icon = 'rocket';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].icon).toBe('rocket');
    });

    it('should extract supportsBackgroundMode from action command', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Background Action';
      actionCommand.supportsBackgroundMode = true;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].supportsBackgroundMode).toBe(true);
    });

    it('should extract allowConcurrent from action command', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Concurrent Action';
      actionCommand.allowConcurrent = false;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].allowConcurrent).toBe(false);
    });

    it('should generate placeholder command path for action command', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Test Action';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].command.command).toBe('action-Test Action.js');
    });

    it('should extract timeout from action command', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Slow Action';
      actionCommand.timeout = 60000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].command.timeout).toBe(60000);
    });

    it('should generate action id from actionName when not provided', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Launch Claude';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].id).toBe('launch-claude');
    });

    it('should use explicit id when provided', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Launch Claude';
      actionCommand.id = 'custom-id';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].id).toBe('custom-id');
    });
  });

  describe('ActionCommand to Action conversion', () => {
    it('should convert ActionCommand with all metadata', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Full Action';
      actionCommand.description = 'A full action';
      actionCommand.icon = 'star';
      actionCommand.supportsBackgroundMode = true;
      actionCommand.allowConcurrent = false;
      actionCommand.timeout = 30000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);
      const action = result.environments.default.actions[0];

      expect(action.name).toBe('Full Action');
      expect(action.description).toBe('A full action');
      expect(action.icon).toBe('star');
      expect(action.supportsBackgroundMode).toBe(true);
      expect(action.allowConcurrent).toBe(false);
      expect(action.command).toBeDefined();
      expect(action.command.command).toBe('action-Full Action.js');
      expect(action.command.timeout).toBe(30000);
    });

    it('should convert ActionCommand with minimal metadata', () => {
      const actionCommand = vi.fn() as unknown as ActionCommand;
      actionCommand.factoryType = 'action';
      actionCommand.actionName = 'Simple Action';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [actionCommand]
          }
        }
      };

      const result = serializeSettings(config);
      const action = result.environments.default.actions[0];

      expect(action.name).toBe('Simple Action');
      expect(action.command).toBeDefined();
      expect(action.description).toBeUndefined();
      expect(action.icon).toBeUndefined();
    });
  });

  describe('type hooks to TypeDefinition conversion', () => {
    it('should convert type with only version', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              'simple-type': {
                version: '1.0.0'
              }
            }
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.types).toBeDefined();
      expect(result.environments.default.types?.['simple-type'].version).toBe('1.0.0');
    });

    it('should convert type validator command', () => {
      const validatorCommand = vi.fn() as unknown as TypeValidatorCommand;
      validatorCommand.factoryType = 'typeValidator';
      validatorCommand.typeName = 'adaptive-card';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              'adaptive-card': {
                version: '1.0.0',
                validator: validatorCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const typeDef = result.environments.default.types?.['adaptive-card'];

      expect(typeDef?.validator).toBeDefined();
      expect(typeDef?.validator?.command).toBe('typeValidator-adaptive-card.js');
    });

    it('should convert type create command', () => {
      const createCommand = vi.fn() as unknown as TypeCreateCommand;
      createCommand.factoryType = 'typeCreate';
      createCommand.typeName = 'note';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              note: {
                version: '1.0.0',
                create: createCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const typeDef = result.environments.default.types?.note;

      expect(typeDef?.create).toBeDefined();
      expect(typeDef?.create?.command).toBe('typeCreate-note.js');
    });

    it('should convert type update command', () => {
      const updateCommand = vi.fn() as unknown as TypeUpdateCommand;
      updateCommand.factoryType = 'typeUpdate';
      updateCommand.typeName = 'task';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              task: {
                version: '1.0.0',
                update: updateCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const typeDef = result.environments.default.types?.task;

      expect(typeDef?.update).toBeDefined();
      expect(typeDef?.update?.command).toBe('typeUpdate-task.js');
    });

    it('should convert type delete command', () => {
      const deleteCommand = vi.fn() as unknown as TypeDeleteCommand;
      deleteCommand.factoryType = 'typeDelete';
      deleteCommand.typeName = 'deprecated-type';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              'deprecated-type': {
                version: '1.0.0',
                delete: deleteCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const typeDef = result.environments.default.types?.['deprecated-type'];

      expect(typeDef?.delete).toBeDefined();
      expect(typeDef?.delete?.command).toBe('typeDelete-deprecated-type.js');
    });

    it('should extract timeout from type hook commands', () => {
      const validatorCommand = vi.fn() as unknown as TypeValidatorCommand;
      validatorCommand.factoryType = 'typeValidator';
      validatorCommand.typeName = 'slow-type';
      validatorCommand.timeout = 10000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              'slow-type': {
                version: '1.0.0',
                validator: validatorCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const typeDef = result.environments.default.types?.['slow-type'];

      expect(typeDef?.validator?.timeout).toBe(10000);
    });

    it('should convert type with all lifecycle hooks', () => {
      const validatorCommand = vi.fn() as unknown as TypeValidatorCommand;
      validatorCommand.factoryType = 'typeValidator';
      validatorCommand.typeName = 'full-type';

      const createCommand = vi.fn() as unknown as TypeCreateCommand;
      createCommand.factoryType = 'typeCreate';
      createCommand.typeName = 'full-type';

      const updateCommand = vi.fn() as unknown as TypeUpdateCommand;
      updateCommand.factoryType = 'typeUpdate';
      updateCommand.typeName = 'full-type';

      const deleteCommand = vi.fn() as unknown as TypeDeleteCommand;
      deleteCommand.factoryType = 'typeDelete';
      deleteCommand.typeName = 'full-type';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              'full-type': {
                version: '2.0.0',
                validator: validatorCommand,
                create: createCommand,
                update: updateCommand,
                delete: deleteCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const typeDef = result.environments.default.types?.['full-type'];

      expect(typeDef?.version).toBe('2.0.0');
      expect(typeDef?.validator?.command).toBe('typeValidator-full-type.js');
      expect(typeDef?.create?.command).toBe('typeCreate-full-type.js');
      expect(typeDef?.update?.command).toBe('typeUpdate-full-type.js');
      expect(typeDef?.delete?.command).toBe('typeDelete-full-type.js');
    });
  });

  describe('stream transform to StreamDefinition conversion', () => {
    it('should extract streamType and generate correct command path', () => {
      const transformCommand = vi.fn() as unknown as StreamTransformCommand;
      transformCommand.factoryType = 'streamTransform';
      transformCommand.streamType = 'jsonl';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: transformCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const streamDef = result.environments.default.streams?.['jsonl-stream'];

      expect(streamDef?.transform.path).toBe('streamTransform-jsonl.js');
    });

    it('should preserve version field', () => {
      const transformCommand = vi.fn() as unknown as StreamTransformCommand;
      transformCommand.factoryType = 'streamTransform';
      transformCommand.streamType = 'jsonl';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: transformCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const streamDef = result.environments.default.streams?.['jsonl-stream'];

      expect(streamDef?.version).toBe(1);
    });

    it('should extract timeout from transform command', () => {
      const transformCommand = vi.fn() as unknown as StreamTransformCommand;
      transformCommand.factoryType = 'streamTransform';
      transformCommand.streamType = 'jsonl';
      transformCommand.timeout = 5000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: transformCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const streamDef = result.environments.default.streams?.['jsonl-stream'];

      expect(streamDef?.transform.timeout).toBe(5000);
    });

    it('should extract maxLineLength from transform command', () => {
      const transformCommand = vi.fn() as unknown as StreamTransformCommand;
      transformCommand.factoryType = 'streamTransform';
      transformCommand.streamType = 'jsonl';
      transformCommand.maxLineLength = 1024;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: transformCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const streamDef = result.environments.default.streams?.['jsonl-stream'];

      expect(streamDef?.maxLineLength).toBe(1024);
    });

    it('should extract maxStreamSize from transform command', () => {
      const transformCommand = vi.fn() as unknown as StreamTransformCommand;
      transformCommand.factoryType = 'streamTransform';
      transformCommand.streamType = 'jsonl';
      transformCommand.maxStreamSize = 1048576;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: transformCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const streamDef = result.environments.default.streams?.['jsonl-stream'];

      expect(streamDef?.maxStreamSize).toBe(1048576);
    });

    it('should handle stream with all metadata', () => {
      const transformCommand = vi.fn() as unknown as StreamTransformCommand;
      transformCommand.factoryType = 'streamTransform';
      transformCommand.streamType = 'jsonl';
      transformCommand.timeout = 5000;
      transformCommand.maxLineLength = 1024;
      transformCommand.maxStreamSize = 1048576;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [],
            streams: {
              'jsonl-stream': {
                version: 1,
                transform: transformCommand
              }
            }
          }
        }
      };

      const result = serializeSettings(config);
      const streamDef = result.environments.default.streams?.['jsonl-stream'];

      expect(streamDef?.version).toBe(1);
      expect(streamDef?.transform.path).toBe('streamTransform-jsonl.js');
      expect(streamDef?.transform.timeout).toBe(5000);
      expect(streamDef?.maxLineLength).toBe(1024);
      expect(streamDef?.maxStreamSize).toBe(1048576);
    });

    it('should handle multiple streams in one environment', () => {
      const jsonlTransform = vi.fn() as unknown as StreamTransformCommand;
      jsonlTransform.factoryType = 'streamTransform';
      jsonlTransform.streamType = 'jsonl';

      const logsTransform = vi.fn() as unknown as StreamTransformCommand;
      logsTransform.factoryType = 'streamTransform';
      logsTransform.streamType = 'logs';

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
              'logs-stream': {
                version: 1,
                transform: logsTransform
              }
            }
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.streams?.['jsonl-stream']).toBeDefined();
      expect(result.environments.default.streams?.['logs-stream']).toBeDefined();
      expect(result.environments.default.streams?.['jsonl-stream'].transform.path).toBe('streamTransform-jsonl.js');
      expect(result.environments.default.streams?.['logs-stream'].transform.path).toBe('streamTransform-logs.js');
    });

    it('should handle missing streams gracefully', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: []
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.streams).toBeUndefined();
    });
  });

  describe('environment structure preservation', () => {
    it('should preserve environment version', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 2,
            actions: []
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.version).toBe(2);
    });

    it('should preserve environment description', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            description: 'Development environment',
            actions: []
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.description).toBe('Development environment');
    });

    it('should handle environment without types', () => {
      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: []
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.types).toBeUndefined();
    });

    it('should convert multiple actions in an environment', () => {
      const action1 = vi.fn() as unknown as ActionCommand;
      action1.factoryType = 'action';
      action1.actionName = 'Action 1';

      const action2 = vi.fn() as unknown as ActionCommand;
      action2.factoryType = 'action';
      action2.actionName = 'Action 2';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [action1, action2]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions).toHaveLength(2);
      expect(result.environments.default.actions[0].name).toBe('Action 1');
      expect(result.environments.default.actions[1].name).toBe('Action 2');
    });
  });

  describe('multiple environments', () => {
    it('should handle multiple environments', () => {
      const devAction = vi.fn() as unknown as ActionCommand;
      devAction.factoryType = 'action';
      devAction.actionName = 'Dev Action';

      const prodAction = vi.fn() as unknown as ActionCommand;
      prodAction.factoryType = 'action';
      prodAction.actionName = 'Prod Action';

      const config: SettingsConfig = {
        environments: {
          development: {
            version: 1,
            actions: [devAction]
          },
          production: {
            version: 1,
            actions: [prodAction]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.development).toBeDefined();
      expect(result.environments.production).toBeDefined();
      expect(result.environments.development.actions[0].name).toBe('Dev Action');
      expect(result.environments.production.actions[0].name).toBe('Prod Action');
    });

    it('should preserve environment names as keys', () => {
      const config: SettingsConfig = {
        environments: {
          custom: {
            version: 1,
            actions: []
          }
        }
      };

      const result = serializeSettings(config);

      expect(Object.keys(result.environments)).toContain('custom');
    });
  });

  describe('complex integration', () => {
    it('should handle full config with actions and types', () => {
      const launchAction = vi.fn() as unknown as ActionCommand;
      launchAction.factoryType = 'action';
      launchAction.actionName = 'Launch Claude';
      launchAction.description = 'Launch Claude in a new window';
      launchAction.icon = 'rocket';
      launchAction.supportsBackgroundMode = true;
      launchAction.allowConcurrent = false;
      launchAction.timeout = 30000;

      const noteValidator = vi.fn() as unknown as TypeValidatorCommand;
      noteValidator.factoryType = 'typeValidator';
      noteValidator.typeName = 'note';
      noteValidator.timeout = 2000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            description: 'Default environment',
            actions: [launchAction],
            types: {
              note: {
                version: '1.0.0',
                validator: noteValidator
              }
            }
          }
        }
      };

      const result = serializeSettings(config);

      // Verify environment
      expect(result.environments.default.version).toBe(1);
      expect(result.environments.default.description).toBe('Default environment');

      // Verify action
      const action = result.environments.default.actions[0];
      expect(action.name).toBe('Launch Claude');
      expect(action.description).toBe('Launch Claude in a new window');
      expect(action.icon).toBe('rocket');
      expect(action.supportsBackgroundMode).toBe(true);
      expect(action.allowConcurrent).toBe(false);
      expect(action.command.command).toBe('action-Launch Claude.js');
      expect(action.command.timeout).toBe(30000);
      expect(action.id).toBe('launch-claude');

      // Verify type
      const typeDef = result.environments.default.types?.note;
      expect(typeDef?.version).toBe('1.0.0');
      expect(typeDef?.validator?.command).toBe('typeValidator-note.js');
      expect(typeDef?.validator?.timeout).toBe(2000);
    });
  });

  describe('error handling', () => {
    it('should throw for type without version', () => {
      const config = {
        environments: {
          default: {
            version: 1,
            actions: [],
            types: {
              invalid: {}
            }
          }
        }
      } as unknown as SettingsConfig;

      expect(() => serializeSettings(config)).toThrow();
    });
  });
});
