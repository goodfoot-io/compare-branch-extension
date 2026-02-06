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
 * import { defineConfig } from '@cards/configuration';
 * import { defineActionStart } from '@cards/configuration/factories';
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
/**
 * Serializes a type hook command to a Command object.
 * Returns undefined if the hook is not present.
 */
function serializeTypeHook(hook) {
  if (!hook) {
    return undefined;
  }
  const command = {
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
function serializeStreamConfig(streamConfig) {
  const { version, transform } = streamConfig;
  const streamDef = {
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
 * Serializes an action pair to an Action object.
 * Extracts metadata from start/end commands and generates command paths.
 */
function serializeActionPair(actionPair) {
  if (!actionPair.start) {
    throw new Error('Action must have a start command');
  }
  const { start } = actionPair;
  const action = {
    name: start.actionName,
    start: {
      command: `${start.factoryType}-${start.actionName}.js`
    }
  };
  if (start.timeout !== undefined) {
    action.start.timeout = start.timeout;
  }
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
  if (actionPair.end) {
    const { end } = actionPair;
    action.end = {
      command: `${end.factoryType}-${end.actionName}.js`
    };
    if (end.timeout !== undefined) {
      action.end.timeout = end.timeout;
    }
  }
  return action;
}
/**
 * Serializes a type configuration to a TypeDefinition object.
 */
function serializeTypeConfig(typeName, typeConfig) {
  if (!typeConfig.version) {
    throw new Error(`Type "${typeName}" must have a version`);
  }
  return {
    version: typeConfig.version,
    validator: serializeTypeHook(typeConfig.validator),
    create: serializeTypeHook(typeConfig.create),
    update: serializeTypeHook(typeConfig.update),
    delete: serializeTypeHook(typeConfig.delete)
  };
}
/**
 * Serializes an environment configuration to an Environment object.
 */
function serializeEnvironment(envConfig) {
  const env = {
    version: envConfig.version ?? 1,
    actions: envConfig.actions.map(serializeActionPair)
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
 * import { defineConfig } from '@cards/configuration';
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
export function defineConfig(config) {
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
export function serializeSettings(config) {
  const environments = {};
  for (const [envName, envConfig] of Object.entries(config.environments)) {
    environments[envName] = serializeEnvironment(envConfig);
  }
  return { environments };
}
