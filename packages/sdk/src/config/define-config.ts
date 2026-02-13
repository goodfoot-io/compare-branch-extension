/**
 * Configuration utilities for Cards settings.
 *
 * This module provides two key functions:
 * - `defineConfig()`: IDE intellisense helper (identity function)
 * - `serializeSettings()`: Transforms config with command objects to settings.json schema
 *
 *
 * @summary Configuration utilities for Cards settings
 * @module define-config
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards/sdk/config';
 * import { defineAction } from '@cards/sdk/config/factories';
 *
 * const launch = defineAction({ actionName: 'Launch' }, async () => {});
 *
 * export default defineConfig({
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [launch]
 *     }
 *   }
 * });
 * ```
 */

import type { ActionCommand } from './command-types.js';
import type { EnvironmentConfig, SettingsConfig, StreamConfigDefinition, TypeConfigDefinition } from './config.js';
import type { Action, Command, Environment, Settings, StreamDefinition, TypeDefinition } from './schema.js';

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
 * Converts a string to a URL-safe slug.
 *
 * @param name - The string to slugify
 * @returns A lowercase string with non-alphanumeric characters replaced by hyphens
 *
 * @internal
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
 * Serializes a stream configuration to a StreamDefinition object.
 * Extracts metadata from the transform command and generates the command path.
 */
function serializeStreamConfig(streamConfig: StreamConfigDefinition): StreamDefinition {
  const { version, transform } = streamConfig;

  const streamDef: StreamDefinition = {
    version,
    transform: {
      path: `${transform.factoryType}-${transform.streamType}.js`
    }
  };

  if (transform.timeout !== undefined) {
    streamDef.transform.timeout = transform.timeout;
  }

  if (transform.maxLineLength !== undefined) {
    streamDef.maxLineLength = transform.maxLineLength;
  }

  if (transform.maxStreamSize !== undefined) {
    streamDef.maxStreamSize = transform.maxStreamSize;
  }

  return streamDef;
}

/**
 * Serializes an action command to an Action object.
 * Extracts metadata from the command and generates the command path.
 */
function serializeAction(actionCommand: ActionCommand): Action {
  const action: Action = {
    id: actionCommand.id ?? slugify(actionCommand.actionName),
    name: actionCommand.actionName,
    command: {
      command: `${actionCommand.factoryType}-${actionCommand.actionName}.js`
    }
  };

  if (actionCommand.timeout !== undefined) {
    action.command.timeout = actionCommand.timeout;
  }

  if (actionCommand.description !== undefined) {
    action.description = actionCommand.description;
  }

  if (actionCommand.icon !== undefined) {
    action.icon = actionCommand.icon;
  }

  if (actionCommand.supportsBackgroundMode !== undefined) {
    action.supportsBackgroundMode = actionCommand.supportsBackgroundMode;
  }

  if (actionCommand.allowConcurrent !== undefined) {
    action.allowConcurrent = actionCommand.allowConcurrent;
  }

  return action;
}

/**
 * Serializes a type configuration to a TypeDefinition object.
 */
function serializeTypeConfig(typeName: string, typeConfig: TypeConfigDefinition): TypeDefinition {
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

  if (typeConfig.validator?.schema !== undefined) {
    typeDef.schema = typeConfig.validator.schema;
  }
  if (typeConfig.validator?.description !== undefined) {
    typeDef.description = typeConfig.validator.description;
  }

  return typeDef;
}

/**
 * Serializes an environment configuration to an Environment object.
 */
function serializeEnvironment(envConfig: EnvironmentConfig): Environment {
  const env: Environment = {
    version: envConfig.version ?? 1,
    actions: envConfig.actions.map(serializeAction)
  };

  if (envConfig.description !== undefined) {
    env.description = envConfig.description;
  }

  if (envConfig.types) {
    env.types = {};
    for (const [typeName, typeConfig] of Object.entries(envConfig.types)) {
      env.types[typeName] = serializeTypeConfig(typeName, typeConfig);
    }
  }

  if (envConfig.streams) {
    env.streams = {};
    for (const [streamName, streamConfig] of Object.entries(envConfig.streams)) {
      env.streams[streamName] = serializeStreamConfig(streamConfig);
    }
  }

  return env;
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
 * import { defineConfig } from '@cards/sdk/config';
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
 * - Action metadata (name, description, icon, etc.) from ActionCommand
 * - Type hook metadata from TypeValidatorCommand, TypeCreateCommand, etc.
 *
 * @param config - The settings configuration with command objects
 * @returns Settings object compatible with settings.json schema
 *
 * @throws {Error} If required fields are missing or invalid
 *
 * @example
 * ```typescript
 * const launch = defineAction({
 *   actionName: 'Launch',
 *   description: 'Launch Claude',
 *   icon: 'rocket'
 * }, handler);
 *
 * const config = {
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [launch]
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
 * //         id: 'launch',
 * //         name: 'Launch',
 * //         description: 'Launch Claude',
 * //         icon: 'rocket',
 * //         command: { command: 'action-Launch.js' }
 * //       }]
 * //     }
 * //   }
 * // }
 * ```
 */
export function serializeSettings(config: SettingsConfig): Settings {
  const environments: Settings['environments'] = {};

  for (const [envName, envConfig] of Object.entries(config.environments)) {
    environments[envName] = serializeEnvironment(envConfig);
  }

  return { environments };
}
