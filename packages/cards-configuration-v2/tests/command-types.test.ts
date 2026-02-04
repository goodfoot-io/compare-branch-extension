/**
 * Tests for command type definitions.
 *
 * These are type-level tests that verify the structure and generic type
 * preservation of command types used by factory functions.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type {
  ActionEndCommand,
  ActionStartCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from '../src/command-types.js';
import type { ActionContext, ActionEndInput, ActionStartInput, TypeHookInput } from '../src/inputs.js';

describe('command-types', () => {
  describe('ActionStartCommand', () => {
    it('should be callable with ActionStartInput and ActionContext', () => {
      const fn = async (input: ActionStartInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<ActionStartInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'actionStart' as const,
        actionName: 'Test'
      });

      expectTypeOf(command).toBeCallableWith({} as ActionStartInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'actionStart' as const,
        actionName: 'Test'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<ActionStartCommand>().toHaveProperty('factoryType');
      expectTypeOf<ActionStartCommand['factoryType']>().toEqualTypeOf<'actionStart'>();
    });

    it('should have actionName property', () => {
      expectTypeOf<ActionStartCommand>().toHaveProperty('actionName');
      expectTypeOf<ActionStartCommand['actionName']>().toEqualTypeOf<string>();
    });

    it('should have optional metadata properties', () => {
      expectTypeOf<ActionStartCommand>().toMatchTypeOf<{
        description?: string;
        icon?: string;
        supportsBackgroundMode?: boolean;
        allowConcurrent?: boolean;
        timeout?: number;
      }>();
    });

    it('should preserve literal action name type', () => {
      const fn = async () => {};
      const command: ActionStartCommand<'Launch Claude'> = Object.assign(fn, {
        factoryType: 'actionStart' as const,
        actionName: 'Launch Claude' as const
      });

      expectTypeOf(command.actionName).toEqualTypeOf<'Launch Claude'>();
    });

    it('should default to string when no generic provided', () => {
      const fn = async () => {};
      const command: ActionStartCommand = Object.assign(fn, {
        factoryType: 'actionStart' as const,
        actionName: 'Any Action Name'
      });

      expectTypeOf(command.actionName).toEqualTypeOf<string>();
    });

    it('should allow different literal types for different commands', () => {
      const launchFn = async () => {};
      const launchCommand: ActionStartCommand<'Launch'> = Object.assign(launchFn, {
        factoryType: 'actionStart' as const,
        actionName: 'Launch' as const
      });

      const deployFn = async () => {};
      const deployCommand: ActionStartCommand<'Deploy'> = Object.assign(deployFn, {
        factoryType: 'actionStart' as const,
        actionName: 'Deploy' as const
      });

      expectTypeOf(launchCommand.actionName).toEqualTypeOf<'Launch'>();
      expectTypeOf(deployCommand.actionName).toEqualTypeOf<'Deploy'>();
      expectTypeOf(launchCommand.actionName).not.toEqualTypeOf<'Deploy'>();
    });
  });

  describe('ActionEndCommand', () => {
    it('should be callable with ActionEndInput and ActionContext', () => {
      const fn = async (input: ActionEndInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<ActionEndInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'actionEnd' as const,
        actionName: 'Test'
      });

      expectTypeOf(command).toBeCallableWith({} as ActionEndInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'actionEnd' as const,
        actionName: 'Test'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<ActionEndCommand>().toHaveProperty('factoryType');
      expectTypeOf<ActionEndCommand['factoryType']>().toEqualTypeOf<'actionEnd'>();
    });

    it('should have actionName property', () => {
      expectTypeOf<ActionEndCommand>().toHaveProperty('actionName');
      expectTypeOf<ActionEndCommand['actionName']>().toEqualTypeOf<string>();
    });

    it('should have optional timeout property', () => {
      expectTypeOf<ActionEndCommand>().toMatchTypeOf<{
        timeout?: number;
      }>();
    });

    it('should preserve literal action name type', () => {
      const fn = async () => {};
      const command: ActionEndCommand<'Launch Claude'> = Object.assign(fn, {
        factoryType: 'actionEnd' as const,
        actionName: 'Launch Claude' as const
      });

      expectTypeOf(command.actionName).toEqualTypeOf<'Launch Claude'>();
    });

    it('should allow matching action name for pairing', () => {
      const startFn = async () => {};
      const startCommand: ActionStartCommand<'Deploy'> = Object.assign(startFn, {
        factoryType: 'actionStart' as const,
        actionName: 'Deploy' as const
      });

      const endFn = async () => {};
      const endCommand: ActionEndCommand<'Deploy'> = Object.assign(endFn, {
        factoryType: 'actionEnd' as const,
        actionName: 'Deploy' as const
      });

      // Both should have the same action name type
      expectTypeOf(startCommand.actionName).toEqualTypeOf(endCommand.actionName);
    });

    it('should default to string when no generic provided', () => {
      const fn = async () => {};
      const command: ActionEndCommand = Object.assign(fn, {
        factoryType: 'actionEnd' as const,
        actionName: 'Any Action Name'
      });

      expectTypeOf(command.actionName).toEqualTypeOf<string>();
    });
  });

  describe('TypeValidatorCommand', () => {
    it('should be callable with TypeHookInput and ActionContext', () => {
      const fn = async (input: TypeHookInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeValidator' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'typeValidator' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<TypeValidatorCommand>().toHaveProperty('factoryType');
      expectTypeOf<TypeValidatorCommand['factoryType']>().toEqualTypeOf<'typeValidator'>();
    });

    it('should have typeName property', () => {
      expectTypeOf<TypeValidatorCommand>().toHaveProperty('typeName');
      expectTypeOf<TypeValidatorCommand['typeName']>().toEqualTypeOf<string>();
    });

    it('should have optional timeout property', () => {
      expectTypeOf<TypeValidatorCommand>().toMatchTypeOf<{
        timeout?: number;
      }>();
    });

    it('should preserve literal type name', () => {
      const fn = async () => {};
      const command: TypeValidatorCommand<'adaptive-card'> = Object.assign(fn, {
        factoryType: 'typeValidator' as const,
        typeName: 'adaptive-card' as const
      });

      expectTypeOf(command.typeName).toEqualTypeOf<'adaptive-card'>();
    });

    it('should default to string when no generic provided', () => {
      const fn = async () => {};
      const command: TypeValidatorCommand = Object.assign(fn, {
        factoryType: 'typeValidator' as const,
        typeName: 'any-type'
      });

      expectTypeOf(command.typeName).toEqualTypeOf<string>();
    });
  });

  describe('TypeCreateCommand', () => {
    it('should be callable with TypeHookInput and ActionContext', () => {
      const fn = async (input: TypeHookInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeCreate' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'typeCreate' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<TypeCreateCommand['factoryType']>().toEqualTypeOf<'typeCreate'>();
    });

    it('should have typeName property', () => {
      expectTypeOf<TypeCreateCommand['typeName']>().toEqualTypeOf<string>();
    });

    it('should preserve literal type name', () => {
      const fn = async () => {};
      const command: TypeCreateCommand<'task-spec'> = Object.assign(fn, {
        factoryType: 'typeCreate' as const,
        typeName: 'task-spec' as const
      });

      expectTypeOf(command.typeName).toEqualTypeOf<'task-spec'>();
    });
  });

  describe('TypeUpdateCommand', () => {
    it('should be callable with TypeHookInput and ActionContext', () => {
      const fn = async (input: TypeHookInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeUpdate' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'typeUpdate' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<TypeUpdateCommand['factoryType']>().toEqualTypeOf<'typeUpdate'>();
    });

    it('should have typeName property', () => {
      expectTypeOf<TypeUpdateCommand['typeName']>().toEqualTypeOf<string>();
    });

    it('should preserve literal type name', () => {
      const fn = async () => {};
      const command: TypeUpdateCommand<'note'> = Object.assign(fn, {
        factoryType: 'typeUpdate' as const,
        typeName: 'note' as const
      });

      expectTypeOf(command.typeName).toEqualTypeOf<'note'>();
    });
  });

  describe('TypeDeleteCommand', () => {
    it('should be callable with TypeHookInput and ActionContext', () => {
      const fn = async (input: TypeHookInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeDelete' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'typeDelete' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<TypeDeleteCommand['factoryType']>().toEqualTypeOf<'typeDelete'>();
    });

    it('should have typeName property', () => {
      expectTypeOf<TypeDeleteCommand['typeName']>().toEqualTypeOf<string>();
    });

    it('should preserve literal type name', () => {
      const fn = async () => {};
      const command: TypeDeleteCommand<'config'> = Object.assign(fn, {
        factoryType: 'typeDelete' as const,
        typeName: 'config' as const
      });

      expectTypeOf(command.typeName).toEqualTypeOf<'config'>();
    });
  });

  describe('Generic type preservation across all commands', () => {
    it('should preserve literal types for action commands', () => {
      type StartCmd = ActionStartCommand<'Build'>;
      type EndCmd = ActionEndCommand<'Build'>;

      expectTypeOf<StartCmd['actionName']>().toEqualTypeOf<'Build'>();
      expectTypeOf<EndCmd['actionName']>().toEqualTypeOf<'Build'>();
      expectTypeOf<StartCmd['actionName']>().toEqualTypeOf<EndCmd['actionName']>();
    });

    it('should preserve literal types for type commands', () => {
      type ValidatorCmd = TypeValidatorCommand<'schema'>;
      type CreateCmd = TypeCreateCommand<'schema'>;
      type UpdateCmd = TypeUpdateCommand<'schema'>;
      type DeleteCmd = TypeDeleteCommand<'schema'>;

      expectTypeOf<ValidatorCmd['typeName']>().toEqualTypeOf<'schema'>();
      expectTypeOf<CreateCmd['typeName']>().toEqualTypeOf<'schema'>();
      expectTypeOf<UpdateCmd['typeName']>().toEqualTypeOf<'schema'>();
      expectTypeOf<DeleteCmd['typeName']>().toEqualTypeOf<'schema'>();
    });

    it('should allow string as default generic', () => {
      type StartCmd = ActionStartCommand;
      type EndCmd = ActionEndCommand;
      type ValidatorCmd = TypeValidatorCommand;

      expectTypeOf<StartCmd['actionName']>().toEqualTypeOf<string>();
      expectTypeOf<EndCmd['actionName']>().toEqualTypeOf<string>();
      expectTypeOf<ValidatorCmd['typeName']>().toEqualTypeOf<string>();
    });
  });
});
