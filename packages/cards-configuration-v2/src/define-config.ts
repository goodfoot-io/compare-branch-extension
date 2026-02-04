/**
 * Configuration utilities for Cards settings.
 *
 * This module provides two key functions:
 * - `defineConfig()`: IDE intellisense helper (identity function)
 * - `serializeSettings()`: Transforms config with command objects to settings.json schema
 *
 * @module define-config
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards/configuration-v2';
 * import { defineActionStart } from '@cards/configuration-v2/factories';
 *
 * const launchStart = defineActionStart({ actionName: 'Launch' }, async () => {});
 *
 * export default defineConfig({
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [{ start: launchStart }]
 *     }
 *   }
 * });
 * ```
 */

import type { SettingsConfig } from './config.js';
import type { Action, Command, Settings, TypeDefinition } from './schema.js';

/**
 * Type hook command with factoryType and typeName properties.
 * Used internally for serializing type lifecycle hooks.
 */
interface TypeHookCommand {
  factoryType: string;
  typeName: string;
  timeout?: number;
}

/**
 * Serializes a type hook command to a Command object.
 * Returns undefined if the hook is not present.
 */
function serializeTypeHook(hook: TypeHookCommand | undefined): Command | undefined {
  if (!hook) {
    return undefined;
  }
  const command: Command = {
    command: `${hook.factoryType}-${hook.typeName}.js`
  };
  if (hook.timeout !== undefined) {
    command.timeout = hook.timeout;
  }
  return command;
}

/**
 * Helper function for IDE intellisense in settings.config.ts files.
 *
 * This is an identity function that returns the config object unchanged.
 * Its purpose is to provide TypeScript type checking and autocomplete in
 * user configuration files.
 *
 * @param config - The settings configuration object
 * @returns The same config object (identity function)
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards/configuration-v2';
 *
 * export default defineConfig({
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: []
 *     }
 *   }
 * });
 * ```
 */
export function defineConfig(config: SettingsConfig): SettingsConfig {
  return config;
}

/**
 * Serializes a config with command objects to a settings.json-compatible object.
 *
 * This function transforms the configuration format used in settings.config.ts
 * (which contains imported command objects with metadata) into the schema format
 * used in settings.json (plain objects with command strings).
 *
 * The transformation extracts metadata from command objects:
 * - Action metadata (name, description, icon, etc.) from ActionStartCommand
 * - End command metadata from ActionEndCommand
 * - Type hook metadata from TypeValidatorCommand, TypeCreateCommand, etc.
 *
 * @param config - The settings configuration with command objects
 * @returns Settings object compatible with settings.json schema
 *
 * @throws {Error} If required fields are missing or invalid
 *
 * @example
 * ```typescript
 * const launchStart = defineActionStart({
 *   actionName: 'Launch',
 *   description: 'Launch Claude',
 *   icon: 'rocket'
 * }, handler);
 *
 * const config = {
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [{ start: launchStart }]
 *     }
 *   }
 * };
 *
 * const settings = serializeSettings(config);
 * // Result:
 * // {
 * //   environments: {
 * //     default: {
 * //       version: 1,
 * //       actions: [{
 * //         name: 'Launch',
 * //         description: 'Launch Claude',
 * //         icon: 'rocket',
 * //         start: { command: 'actionStart-Launch.js' }
 * //       }]
 * //     }
 * //   }
 * // }
 * ```
 */
export function serializeSettings(config: SettingsConfig): Settings {
  const serializedEnvironments: Settings['environments'] = {};

  for (const [envName, envConfig] of Object.entries(config.environments)) {
    // Serialize actions
    const serializedActions = envConfig.actions.map((actionPair) => {
      if (!actionPair.start) {
        throw new Error('Action must have a start command');
      }

      const start = actionPair.start;
      const action: Action = {
        name: start.actionName,
        start: {
          command: `${start.factoryType}-${start.actionName}.js`
        }
      };

      // Add optional start command timeout
      if (start.timeout !== undefined) {
        action.start.timeout = start.timeout;
      }

      // Add optional metadata from start command
      if (start.description !== undefined) {
        action.description = start.description;
      }
      if (start.icon !== undefined) {
        action.icon = start.icon;
      }
      if (start.supportsBackgroundMode !== undefined) {
        action.supportsBackgroundMode = start.supportsBackgroundMode;
      }
      if (start.allowConcurrent !== undefined) {
        action.allowConcurrent = start.allowConcurrent;
      }

      // Add end command if present
      if (actionPair.end) {
        const end = actionPair.end;
        action.end = {
          command: `${end.factoryType}-${end.actionName}.js`
        };
        if (end.timeout !== undefined) {
          action.end.timeout = end.timeout;
        }
      }

      return action;
    });

    // Serialize types
    let serializedTypes: Settings['environments'][string]['types'];
    if (envConfig.types) {
      serializedTypes = {};
      for (const [typeName, typeConfig] of Object.entries(envConfig.types)) {
        if (!typeConfig.version) {
          throw new Error(`Type "${typeName}" must have a version`);
        }

        const typeDef: TypeDefinition = {
          version: typeConfig.version,
          validator: serializeTypeHook(typeConfig.validator),
          create: serializeTypeHook(typeConfig.create),
          update: serializeTypeHook(typeConfig.update),
          delete: serializeTypeHook(typeConfig.delete)
        };

        serializedTypes[typeName] = typeDef;
      }
    }

    // Build the serialized environment
    serializedEnvironments[envName] = {
      version: envConfig.version ?? 1,
      actions: serializedActions
    };

    // Add optional description
    if (envConfig.description !== undefined) {
      serializedEnvironments[envName].description = envConfig.description;
    }

    // Add types if present
    if (serializedTypes) {
      serializedEnvironments[envName].types = serializedTypes;
    }
  }

  return {
    environments: serializedEnvironments
  };
}
