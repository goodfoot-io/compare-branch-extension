/**
 * Tests for defineConfig and serializeSettings functions.
 *
 * These tests verify that defineConfig provides IDE intellisense (identity function)
 * and that serializeSettings correctly transforms config with command objects
 * into settings.json-compatible schema.
 */

import { describe, expect, it, vi } from 'vitest';
import type {
  ActionEndCommand,
  ActionStartCommand,
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
    const mockCommand = vi.fn() as unknown as ActionStartCommand;
    mockCommand.factoryType = 'actionStart';
    mockCommand.actionName = 'Test';

    const config: SettingsConfig = {
      environments: {
        default: {
          version: 1,
          actions: [{ start: mockCommand }]
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
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Launch Claude';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].name).toBe('Launch Claude');
    });

    it('should extract description from start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Deploy';
      startCommand.description = 'Deploy to production';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].description).toBe('Deploy to production');
    });

    it('should extract icon from start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Launch';
      startCommand.icon = 'rocket';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].icon).toBe('rocket');
    });

    it('should extract supportsBackgroundMode from start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Background Action';
      startCommand.supportsBackgroundMode = true;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].supportsBackgroundMode).toBe(true);
    });

    it('should extract allowConcurrent from start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Concurrent Action';
      startCommand.allowConcurrent = false;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].allowConcurrent).toBe(false);
    });

    it('should generate placeholder command path for start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Test Action';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].start.command).toBe('actionStart-Test Action.js');
    });

    it('should extract timeout from start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Slow Action';
      startCommand.timeout = 60000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].start.timeout).toBe(60000);
    });
  });

  describe('ActionPair to Action conversion', () => {
    it('should convert ActionPair with only start command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Simple Action';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand }]
          }
        }
      };

      const result = serializeSettings(config);
      const action = result.environments.default.actions[0];

      expect(action.name).toBe('Simple Action');
      expect(action.start).toBeDefined();
      expect(action.end).toBeUndefined();
    });

    it('should handle optional end command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Full Action';

      const endCommand = vi.fn() as unknown as ActionEndCommand;
      endCommand.factoryType = 'actionEnd';
      endCommand.actionName = 'Full Action';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand, end: endCommand }]
          }
        }
      };

      const result = serializeSettings(config);
      const action = result.environments.default.actions[0];

      expect(action.start).toBeDefined();
      expect(action.end).toBeDefined();
    });

    it('should generate placeholder command path for end command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Action With End';

      const endCommand = vi.fn() as unknown as ActionEndCommand;
      endCommand.factoryType = 'actionEnd';
      endCommand.actionName = 'Action With End';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand, end: endCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].end?.command).toBe('actionEnd-Action With End.js');
    });

    it('should extract timeout from end command', () => {
      const startCommand = vi.fn() as unknown as ActionStartCommand;
      startCommand.factoryType = 'actionStart';
      startCommand.actionName = 'Action';

      const endCommand = vi.fn() as unknown as ActionEndCommand;
      endCommand.factoryType = 'actionEnd';
      endCommand.actionName = 'Action';
      endCommand.timeout = 5000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: startCommand, end: endCommand }]
          }
        }
      };

      const result = serializeSettings(config);

      expect(result.environments.default.actions[0].end?.timeout).toBe(5000);
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
      const action1 = vi.fn() as unknown as ActionStartCommand;
      action1.factoryType = 'actionStart';
      action1.actionName = 'Action 1';

      const action2 = vi.fn() as unknown as ActionStartCommand;
      action2.factoryType = 'actionStart';
      action2.actionName = 'Action 2';

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            actions: [{ start: action1 }, { start: action2 }]
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
      const devAction = vi.fn() as unknown as ActionStartCommand;
      devAction.factoryType = 'actionStart';
      devAction.actionName = 'Dev Action';

      const prodAction = vi.fn() as unknown as ActionStartCommand;
      prodAction.factoryType = 'actionStart';
      prodAction.actionName = 'Prod Action';

      const config: SettingsConfig = {
        environments: {
          development: {
            version: 1,
            actions: [{ start: devAction }]
          },
          production: {
            version: 1,
            actions: [{ start: prodAction }]
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
      const launchStart = vi.fn() as unknown as ActionStartCommand;
      launchStart.factoryType = 'actionStart';
      launchStart.actionName = 'Launch Claude';
      launchStart.description = 'Launch Claude in a new window';
      launchStart.icon = 'rocket';
      launchStart.supportsBackgroundMode = true;
      launchStart.allowConcurrent = false;
      launchStart.timeout = 30000;

      const launchEnd = vi.fn() as unknown as ActionEndCommand;
      launchEnd.factoryType = 'actionEnd';
      launchEnd.actionName = 'Launch Claude';
      launchEnd.timeout = 5000;

      const noteValidator = vi.fn() as unknown as TypeValidatorCommand;
      noteValidator.factoryType = 'typeValidator';
      noteValidator.typeName = 'note';
      noteValidator.timeout = 2000;

      const config: SettingsConfig = {
        environments: {
          default: {
            version: 1,
            description: 'Default environment',
            actions: [{ start: launchStart, end: launchEnd }],
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
      expect(action.start.command).toBe('actionStart-Launch Claude.js');
      expect(action.start.timeout).toBe(30000);
      expect(action.end?.command).toBe('actionEnd-Launch Claude.js');
      expect(action.end?.timeout).toBe(5000);

      // Verify type
      const typeDef = result.environments.default.types?.note;
      expect(typeDef?.version).toBe('1.0.0');
      expect(typeDef?.validator?.command).toBe('typeValidator-note.js');
      expect(typeDef?.validator?.timeout).toBe(2000);
    });
  });

  describe('error handling', () => {
    it('should throw for action without start command', () => {
      const config = {
        environments: {
          default: {
            version: 1,
            actions: [{}]
          }
        }
      } as unknown as SettingsConfig;

      expect(() => serializeSettings(config)).toThrow();
    });

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
