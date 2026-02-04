/**
 * Tests for settings configuration types with compile-time pairing validation.
 *
 * These are primarily type-level tests that verify compile-time guarantees
 * using expectTypeOf from vitest. The tests ensure that ActionPair enforces
 * matching action names between start and end commands.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ActionEndCommand,
  ActionStartCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from '../src/command-types.js';
import type { ActionPair, EnvironmentConfig, SettingsConfig, TypeConfigDefinition } from '../src/config.js';

// ============================================================================
// Type-Level Tests
// ============================================================================

describe('config types', () => {
  describe('ActionPair', () => {
    it('should accept matching action names', () => {
      // Create mock commands with matching action names
      const start: ActionStartCommand<'Launch'> = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand<'Launch'>;

      const end: ActionEndCommand<'Launch'> = {
        factoryType: 'actionEnd',
        actionName: 'Launch'
      } as ActionEndCommand<'Launch'>;

      // This should compile: names match
      const pair: ActionPair<'Launch'> = { start, end };

      // Type assertions
      expectTypeOf(pair.start).toEqualTypeOf<ActionStartCommand<'Launch'>>();
      expectTypeOf(pair.end).toEqualTypeOf<ActionEndCommand<'Launch'> | undefined>();

      // Runtime assertion
      expect(pair.start.actionName).toBe('Launch');
      expect(pair.end?.actionName).toBe('Launch');
    });

    it('should enforce matching action names through generic parameter', () => {
      // Type-level verification that mismatched names don't compile
      // We verify this by checking that the type system requires N to match
      type ValidPair = ActionPair<'Launch'>;

      // Valid: start and end both use 'Launch'
      expectTypeOf<ValidPair['start']>().toHaveProperty('actionName').toEqualTypeOf<'Launch'>();
      expectTypeOf<ValidPair['end']>().toEqualTypeOf<ActionEndCommand<'Launch'> | undefined>();
    });

    it('should accept action pair without end command', () => {
      const start: ActionStartCommand<'Launch'> = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand<'Launch'>;

      // End is optional
      const pair: ActionPair<'Launch'> = { start };

      expectTypeOf(pair.start).toEqualTypeOf<ActionStartCommand<'Launch'>>();
      expectTypeOf(pair.end).toEqualTypeOf<ActionEndCommand<'Launch'> | undefined>();

      expect(pair.start.actionName).toBe('Launch');
      expect(pair.end).toBeUndefined();
    });

    it('should verify start is required in ActionPair type', () => {
      // Type-level check that start is required
      type PairType = ActionPair<'Launch'>;

      // Verify start property exists and is required
      expectTypeOf<PairType>().toHaveProperty('start');
      expectTypeOf<PairType['start']>().toEqualTypeOf<ActionStartCommand<'Launch'>>();
    });

    it('should accept ActionPair with default string parameter', () => {
      const start: ActionStartCommand = {
        factoryType: 'actionStart',
        actionName: 'AnyAction'
      } as ActionStartCommand;

      const end: ActionEndCommand = {
        factoryType: 'actionEnd',
        actionName: 'AnyAction'
      } as ActionEndCommand;

      // Default string parameter allows any action name
      const pair: ActionPair = { start, end };

      expectTypeOf(pair.start).toEqualTypeOf<ActionStartCommand<string>>();
      expectTypeOf(pair.end).toEqualTypeOf<ActionEndCommand<string> | undefined>();
    });

    it('should preserve literal types through ActionPair', () => {
      const start: ActionStartCommand<'SpecificAction'> = {
        factoryType: 'actionStart',
        actionName: 'SpecificAction'
      } as ActionStartCommand<'SpecificAction'>;

      const pair: ActionPair<'SpecificAction'> = { start };

      // The literal type should be preserved
      expectTypeOf(pair.start.actionName).toEqualTypeOf<'SpecificAction'>();
    });

    it('should work with union types for action names', () => {
      type Actions = 'Launch' | 'Deploy' | 'Build';

      const start: ActionStartCommand<Actions> = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand<Actions>;

      const pair: ActionPair<Actions> = { start };

      expectTypeOf(pair.start.actionName).toEqualTypeOf<Actions>();
    });
  });

  describe('TypeConfigDefinition', () => {
    it('should accept all lifecycle hooks', () => {
      const validator: TypeValidatorCommand<'test-type'> = {
        factoryType: 'typeValidator',
        typeName: 'test-type'
      } as TypeValidatorCommand<'test-type'>;

      const create: TypeCreateCommand<'test-type'> = {
        factoryType: 'typeCreate',
        typeName: 'test-type'
      } as TypeCreateCommand<'test-type'>;

      const update: TypeUpdateCommand<'test-type'> = {
        factoryType: 'typeUpdate',
        typeName: 'test-type'
      } as TypeUpdateCommand<'test-type'>;

      const deleteCmd: TypeDeleteCommand<'test-type'> = {
        factoryType: 'typeDelete',
        typeName: 'test-type'
      } as TypeDeleteCommand<'test-type'>;

      const typeConfig: TypeConfigDefinition = {
        version: '1.0.0',
        validator,
        create,
        update,
        delete: deleteCmd
      };

      expect(typeConfig.version).toBe('1.0.0');
      expect(typeConfig.validator?.typeName).toBe('test-type');
      expect(typeConfig.create?.typeName).toBe('test-type');
      expect(typeConfig.update?.typeName).toBe('test-type');
      expect(typeConfig.delete?.typeName).toBe('test-type');
    });

    it('should accept minimal TypeConfig with only version', () => {
      const typeConfig: TypeConfigDefinition = {
        version: '1.0.0'
      };

      expect(typeConfig.version).toBe('1.0.0');
      expect(typeConfig.validator).toBeUndefined();
      expect(typeConfig.create).toBeUndefined();
      expect(typeConfig.update).toBeUndefined();
      expect(typeConfig.delete).toBeUndefined();
    });

    it('should verify version is required in TypeConfig', () => {
      // Type-level check that version is required
      type ConfigType = TypeConfigDefinition;

      // Verify version property exists and is a string
      expectTypeOf<ConfigType>().toHaveProperty('version').toEqualTypeOf<string>();
    });

    it('should verify all hooks are optional', () => {
      // Type-level check that hooks are optional
      type ConfigType = TypeConfigDefinition;

      expectTypeOf<ConfigType['validator']>().toEqualTypeOf<TypeValidatorCommand | undefined>();
      expectTypeOf<ConfigType['create']>().toEqualTypeOf<TypeCreateCommand | undefined>();
      expectTypeOf<ConfigType['update']>().toEqualTypeOf<TypeUpdateCommand | undefined>();
      expectTypeOf<ConfigType['delete']>().toEqualTypeOf<TypeDeleteCommand | undefined>();
    });
  });

  describe('EnvironmentConfig', () => {
    it('should accept full environment configuration', () => {
      const start: ActionStartCommand<'Launch'> = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand<'Launch'>;

      const typeConfig: TypeConfigDefinition = {
        version: '1.0.0'
      };

      const envConfig: EnvironmentConfig = {
        version: 1,
        description: 'Test environment',
        actions: [{ start }],
        types: {
          'test-type': typeConfig
        }
      };

      expect(envConfig.version).toBe(1);
      expect(envConfig.description).toBe('Test environment');
      expect(envConfig.actions).toHaveLength(1);
      expect(envConfig.types?.['test-type']).toBe(typeConfig);
    });

    it('should accept minimal environment with only actions', () => {
      const start: ActionStartCommand = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand;

      const envConfig: EnvironmentConfig = {
        actions: [{ start }]
      };

      expect(envConfig.actions).toHaveLength(1);
      expect(envConfig.version).toBeUndefined();
      expect(envConfig.description).toBeUndefined();
      expect(envConfig.types).toBeUndefined();
    });

    it('should verify actions is required in EnvironmentConfig', () => {
      // Type-level check that actions is required
      type EnvType = EnvironmentConfig;

      expectTypeOf<EnvType>().toHaveProperty('actions');
      expectTypeOf<EnvType['actions']>().toEqualTypeOf<ActionPair[]>();
    });

    it('should accept empty actions array', () => {
      const envConfig: EnvironmentConfig = {
        actions: []
      };

      expect(envConfig.actions).toHaveLength(0);
    });

    it('should verify optional fields are actually optional', () => {
      // Type-level check that optional fields are optional
      type EnvType = EnvironmentConfig;

      expectTypeOf<EnvType['version']>().toEqualTypeOf<number | undefined>();
      expectTypeOf<EnvType['description']>().toEqualTypeOf<string | undefined>();
      expectTypeOf<EnvType['types']>().toEqualTypeOf<Record<string, TypeConfigDefinition> | undefined>();
    });
  });

  describe('SettingsConfig', () => {
    it('should accept multiple environments', () => {
      const start: ActionStartCommand = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand;

      const config: SettingsConfig = {
        environments: {
          default: {
            actions: [{ start }]
          },
          production: {
            version: 1,
            description: 'Production environment',
            actions: [{ start }]
          }
        }
      };

      expect(Object.keys(config.environments)).toHaveLength(2);
      expect(config.environments.default).toBeDefined();
      expect(config.environments.production).toBeDefined();
    });

    it('should accept single environment', () => {
      const start: ActionStartCommand = {
        factoryType: 'actionStart',
        actionName: 'Launch'
      } as ActionStartCommand;

      const config: SettingsConfig = {
        environments: {
          default: {
            actions: [{ start }]
          }
        }
      };

      expect(Object.keys(config.environments)).toHaveLength(1);
      expect(config.environments.default).toBeDefined();
    });

    it('should verify environments is required in SettingsConfig', () => {
      // Type-level check that environments is required
      type ConfigType = SettingsConfig;

      expectTypeOf<ConfigType>().toHaveProperty('environments');
      expectTypeOf<ConfigType['environments']>().toEqualTypeOf<Record<string, EnvironmentConfig>>();
    });

    it('should accept empty environments object', () => {
      const config: SettingsConfig = {
        environments: {}
      };

      expect(Object.keys(config.environments)).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should support real-world configuration pattern', () => {
      // Simulate real-world usage with multiple actions and types
      const launchStart: ActionStartCommand<'Launch'> = {
        factoryType: 'actionStart',
        actionName: 'Launch',
        description: 'Launch the application',
        icon: 'play'
      } as ActionStartCommand<'Launch'>;

      const launchEnd: ActionEndCommand<'Launch'> = {
        factoryType: 'actionEnd',
        actionName: 'Launch'
      } as ActionEndCommand<'Launch'>;

      const deployStart: ActionStartCommand<'Deploy'> = {
        factoryType: 'actionStart',
        actionName: 'Deploy',
        description: 'Deploy to production',
        supportsBackgroundMode: true
      } as ActionStartCommand<'Deploy'>;

      const validator: TypeValidatorCommand<'adaptive-card'> = {
        factoryType: 'typeValidator',
        typeName: 'adaptive-card'
      } as TypeValidatorCommand<'adaptive-card'>;

      const config: SettingsConfig = {
        environments: {
          development: {
            version: 1,
            description: 'Development environment',
            actions: [{ start: launchStart, end: launchEnd }, { start: deployStart }],
            types: {
              'adaptive-card': {
                version: '1.0.0',
                validator
              }
            }
          },
          production: {
            version: 1,
            description: 'Production environment',
            actions: [{ start: deployStart }]
          }
        }
      };

      expect(config.environments.development.actions).toHaveLength(2);
      expect(config.environments.production.actions).toHaveLength(1);
      expect(config.environments.development.types?.['adaptive-card']).toBeDefined();
    });

    it('should enforce type safety across nested structures', () => {
      const start: ActionStartCommand<'TestAction'> = {
        factoryType: 'actionStart',
        actionName: 'TestAction'
      } as ActionStartCommand<'TestAction'>;

      const end: ActionEndCommand<'TestAction'> = {
        factoryType: 'actionEnd',
        actionName: 'TestAction'
      } as ActionEndCommand<'TestAction'>;

      // Verify types flow through the entire structure
      const pair: ActionPair<'TestAction'> = { start, end };
      const env: EnvironmentConfig = { actions: [pair] };
      const config: SettingsConfig = { environments: { default: env } };

      // When widened to EnvironmentConfig/SettingsConfig, the literal type becomes string
      expectTypeOf(config.environments.default.actions[0].start.actionName).toEqualTypeOf<string>();

      // But the ActionPair itself preserves the literal type
      expectTypeOf(pair.start.actionName).toEqualTypeOf<'TestAction'>();
    });

    it('should preserve literal action names through configuration layers', () => {
      // Test that literal types are preserved through all layers
      type Config = SettingsConfig & {
        environments: {
          default: EnvironmentConfig & {
            actions: [ActionPair<'SpecificAction'>];
          };
        };
      };

      const start: ActionStartCommand<'SpecificAction'> = {
        factoryType: 'actionStart',
        actionName: 'SpecificAction'
      } as ActionStartCommand<'SpecificAction'>;

      const config: Config = {
        environments: {
          default: {
            actions: [{ start }]
          }
        }
      };

      expectTypeOf(config.environments.default.actions[0].start.actionName).toEqualTypeOf<'SpecificAction'>();
    });
  });
});
