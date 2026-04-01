/**
 * Tests for command type definitions.
 *
 * These are type-level tests that verify the structure and generic type
 * preservation of command types used by factory functions.
 *
 * @summary Tests for command type definitions
 */

import { describe, expectTypeOf, it } from 'vitest';
import type {
  ActionCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand
} from '../../src/config/command-types.js';
import type { ActionContext, ActionInput, TypeHookContext, TypeHookInput } from '../../src/config/inputs.js';

describe('command-types', () => {
  describe('ActionCommand', () => {
    it('should be callable with ActionInput and ActionContext', () => {
      const fn = async (input: ActionInput, context: ActionContext) => {
        expectTypeOf(input).toEqualTypeOf<ActionInput>();
        expectTypeOf(context).toEqualTypeOf<ActionContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'action' as const,
        actionName: 'Test'
      });

      expectTypeOf(command).toBeCallableWith({} as ActionInput, {} as ActionContext);
    });

    it('should return Promise<void>', () => {
      const fn = async () => {};
      const command = Object.assign(fn, {
        factoryType: 'action' as const,
        actionName: 'Test'
      });

      expectTypeOf(command).returns.toEqualTypeOf<Promise<void>>();
    });

    it('should have factoryType property', () => {
      expectTypeOf<ActionCommand>().toHaveProperty('factoryType');
      expectTypeOf<ActionCommand['factoryType']>().toEqualTypeOf<'action'>();
    });

    it('should have actionName property', () => {
      expectTypeOf<ActionCommand>().toHaveProperty('actionName');
      expectTypeOf<ActionCommand['actionName']>().toEqualTypeOf<string>();
    });

    it('should have optional metadata properties', () => {
      expectTypeOf<ActionCommand>().toMatchTypeOf<{
        id?: string;
        description?: string;
        icon?: string;
        supportsBackgroundMode?: boolean;
        allowConcurrent?: boolean;
        timeout?: number;
      }>();
    });

    it('should preserve literal action name type', () => {
      const fn = async () => {};
      const command: ActionCommand<'Launch Claude'> = Object.assign(fn, {
        factoryType: 'action' as const,
        actionName: 'Launch Claude' as const
      });

      expectTypeOf(command.actionName).toEqualTypeOf<'Launch Claude'>();
    });

    it('should default to string when no generic provided', () => {
      const fn = async () => {};
      const command: ActionCommand = Object.assign(fn, {
        factoryType: 'action' as const,
        actionName: 'Any Action Name'
      });

      expectTypeOf(command.actionName).toEqualTypeOf<string>();
    });

    it('should allow different literal types for different commands', () => {
      const launchFn = async () => {};
      const launchCommand: ActionCommand<'Launch'> = Object.assign(launchFn, {
        factoryType: 'action' as const,
        actionName: 'Launch' as const
      });

      const deployFn = async () => {};
      const deployCommand: ActionCommand<'Deploy'> = Object.assign(deployFn, {
        factoryType: 'action' as const,
        actionName: 'Deploy' as const
      });

      expectTypeOf(launchCommand.actionName).toEqualTypeOf<'Launch'>();
      expectTypeOf(deployCommand.actionName).toEqualTypeOf<'Deploy'>();
      expectTypeOf(launchCommand.actionName).not.toEqualTypeOf<'Deploy'>();
    });
  });

  describe('TypeCreateCommand', () => {
    it('should be callable with TypeHookInput and TypeHookContext', () => {
      const fn = async (input: TypeHookInput, context: TypeHookContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<TypeHookContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeCreate' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as TypeHookContext);
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
    it('should be callable with TypeHookInput and TypeHookContext', () => {
      const fn = async (input: TypeHookInput, context: TypeHookContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<TypeHookContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeUpdate' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as TypeHookContext);
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
    it('should be callable with TypeHookInput and TypeHookContext', () => {
      const fn = async (input: TypeHookInput, context: TypeHookContext) => {
        expectTypeOf(input).toEqualTypeOf<TypeHookInput>();
        expectTypeOf(context).toEqualTypeOf<TypeHookContext>();
      };
      const command = Object.assign(fn, {
        factoryType: 'typeDelete' as const,
        typeName: 'test-type'
      });

      expectTypeOf(command).toBeCallableWith({} as TypeHookInput, {} as TypeHookContext);
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
      type Cmd = ActionCommand<'Build'>;

      expectTypeOf<Cmd['actionName']>().toEqualTypeOf<'Build'>();
    });

    it('should preserve literal types for type commands', () => {
      type CreateCmd = TypeCreateCommand<'schema'>;
      type UpdateCmd = TypeUpdateCommand<'schema'>;
      type DeleteCmd = TypeDeleteCommand<'schema'>;

      expectTypeOf<CreateCmd['typeName']>().toEqualTypeOf<'schema'>();
      expectTypeOf<UpdateCmd['typeName']>().toEqualTypeOf<'schema'>();
      expectTypeOf<DeleteCmd['typeName']>().toEqualTypeOf<'schema'>();
    });

    it('should allow string as default generic', () => {
      type Cmd = ActionCommand;

      expectTypeOf<Cmd['actionName']>().toEqualTypeOf<string>();
    });
  });
});
