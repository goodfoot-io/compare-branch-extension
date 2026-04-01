import { describe, expect, it } from 'vitest';
import type {
  ActionMessage,
  ApiRequestMessage,
  ApiResponseMessage,
  CardDetailMessage,
  EventMessage,
  ExtensionToWebviewMessage,
  LaunchClaudeAction,
  NavigateMessage,
  ServerChangedMessage,
  StateUpdateMessage,
  ThemeUpdateMessage,
  ValidationErrorMessage,
  WebviewAction,
  WebviewDidConnectMessage,
  WebviewState,
  WebviewToExtensionMessage
} from '../../../src/protocol/types/webview.js';

/**
 * Exercises webview behavior in the types area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests webview behavior in types
 */

describe('webview types', () => {
  describe('WebviewToExtensionMessage discriminated union', () => {
    it('should narrow types correctly for webview:didConnect', () => {
      const message: WebviewToExtensionMessage = {
        type: 'webview:didConnect',
        protocolVersion: '1.0'
      };

      switch (message.type) {
        case 'webview:didConnect':
          expect(message.protocolVersion).toBe('1.0');
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for api:request', () => {
      const message: WebviewToExtensionMessage = {
        type: 'api:request',
        requestId: 'req-123',
        method: 'GET',
        path: '/cards/123'
      };

      switch (message.type) {
        case 'api:request':
          expect(message.requestId).toBe('req-123');
          expect(message.method).toBe('GET');
          expect(message.path).toBe('/cards/123');
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for navigate', () => {
      const message: WebviewToExtensionMessage = {
        type: 'navigate',
        route: '/cards/123',
        params: { view: 'detail' }
      };

      switch (message.type) {
        case 'navigate':
          expect(message.route).toBe('/cards/123');
          expect(message.params).toEqual({ view: 'detail' });
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for action', () => {
      const message: WebviewToExtensionMessage = {
        type: 'action',
        action: 'copyToClipboard',
        payload: { text: 'hello' }
      };

      switch (message.type) {
        case 'action':
          expect(message.action).toBe('copyToClipboard');
          expect(message.payload).toEqual({ text: 'hello' });
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for action:launchClaude', () => {
      const message: WebviewToExtensionMessage = {
        type: 'action:launchClaude',
        cardId: 'card-456'
      };

      switch (message.type) {
        case 'action:launchClaude':
          expect(message.cardId).toBe('card-456');
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should handle all union members exhaustively', () => {
      const handleMessage = (msg: WebviewToExtensionMessage): string => {
        switch (msg.type) {
          case 'webview:didConnect':
            return 'connect';
          case 'api:request':
            return 'api';
          case 'navigate':
            return 'nav';
          case 'action':
            return 'action';
          case 'action:launchClaude':
            return 'launch';
          default: {
            // Exhaustive check - this should never be reached
            const _exhaustive: never = msg;
            return _exhaustive;
          }
        }
      };

      expect(handleMessage({ type: 'webview:didConnect', protocolVersion: '1' })).toBe('connect');
      expect(handleMessage({ type: 'api:request', requestId: 'r1', method: 'GET', path: '/test' })).toBe('api');
      expect(handleMessage({ type: 'navigate', route: '/home' })).toBe('nav');
      expect(handleMessage({ type: 'action', action: 'launchClaude', payload: {} })).toBe('action');
      expect(handleMessage({ type: 'action:launchClaude', cardId: 'i1' })).toBe('launch');
    });

    it('should have all 5 message types in the union', () => {
      const messages: WebviewToExtensionMessage[] = [
        { type: 'webview:didConnect', protocolVersion: '1.0' },
        { type: 'api:request', requestId: 'r1', method: 'POST', path: '/cards' },
        { type: 'navigate', route: '/home' },
        { type: 'action', action: 'launchClaude', payload: {} },
        { type: 'action:launchClaude', cardId: 'i1' }
      ];
      expect(messages).toHaveLength(5);
    });
  });

  describe('ExtensionToWebviewMessage discriminated union', () => {
    it('should narrow types correctly for api:response', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'api:response',
        requestId: 'req-123',
        status: 200,
        data: { success: true }
      };

      switch (message.type) {
        case 'api:response':
          expect(message.requestId).toBe('req-123');
          expect(message.status).toBe(200);
          expect(message.data).toEqual({ success: true });
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for state:update', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'state:update',
        state: { isLoading: true }
      };

      switch (message.type) {
        case 'state:update':
          expect(message.state).toEqual({ isLoading: true });
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for event', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'event',
        eventName: 'cards:metadata',
        payload: { cardId: 'i1' }
      };

      switch (message.type) {
        case 'event':
          expect(message.eventName).toBe('cards:metadata');
          expect(message.payload).toEqual({ cardId: 'i1' });
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for card:detail', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'card:detail',
        card: {
          id: 'card-1',
          title: 'Test Card',
          status: 'todo',
          tags: [],
          gates: {
            planRequired: false,
            planApproved: false,
            mergeRequestRequired: false,
            mergeApproved: false
          },
          isPinned: false,
          documents: [],
          isMerged: null,
          order: 0,
          repositoryId: 'main',
          repositoryPath: '/tmp/cards/card-1',
          environment: 'default',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        timeline: []
      };

      switch (message.type) {
        case 'card:detail':
          expect(message.card.id).toBe('card-1');
          expect(message.timeline).toEqual([]);
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for validation:error', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'validation:error',
        field: 'title',
        message: 'Title is required'
      };

      switch (message.type) {
        case 'validation:error':
          expect(message.field).toBe('title');
          expect(message.message).toBe('Title is required');
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should narrow types correctly for theme:update', () => {
      const message: ExtensionToWebviewMessage = {
        type: 'theme:update',
        themeKind: 2
      };

      switch (message.type) {
        case 'theme:update':
          expect(message.themeKind).toBe(2);
          break;
        default:
          throw new Error('Unexpected message type');
      }
    });

    it('should handle all union members exhaustively', () => {
      const handleMessage = (msg: ExtensionToWebviewMessage): string => {
        switch (msg.type) {
          case 'api:response':
            return 'response';
          case 'state:update':
            return 'state';
          case 'event':
            return 'event';
          case 'card:detail':
            return 'detail';
          case 'validation:error':
            return 'error';
          case 'theme:update':
            return 'theme';
          case 'server:changed':
            return 'changed';
          default: {
            // Exhaustive check - this should never be reached
            const _exhaustive: never = msg;
            return _exhaustive;
          }
        }
      };

      expect(handleMessage({ type: 'api:response', requestId: 'r1', status: 200 })).toBe('response');
      expect(handleMessage({ type: 'state:update', state: {} })).toBe('state');
      expect(handleMessage({ type: 'event', eventName: 'test', payload: {} })).toBe('event');
      expect(
        handleMessage({
          type: 'card:detail',
          card: {
            id: 'i1',
            title: 'Test',
            status: 'todo',
            tags: [],
            gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
            isPinned: false,
            documents: [],
            isMerged: null,
            order: 0,
            repositoryId: 'main',
            repositoryPath: '/tmp/cards/i1',
            environment: 'default',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          },
          timeline: []
        })
      ).toBe('detail');
      expect(handleMessage({ type: 'validation:error', field: 'test', message: 'error' })).toBe('error');
      expect(handleMessage({ type: 'theme:update', themeKind: 1 })).toBe('theme');
      expect(
        handleMessage({
          type: 'server:changed',
          baseUrl: 'http://localhost:3001',
          wsUrl: 'ws://localhost:3001/events',
          accessToken: 'token123'
        })
      ).toBe('changed');
    });

    it('should have all 7 message types in the union', () => {
      const messages: ExtensionToWebviewMessage[] = [
        { type: 'api:response', requestId: 'r1', status: 200 },
        { type: 'state:update', state: {} },
        { type: 'event', eventName: 'test', payload: {} },
        {
          type: 'card:detail',
          card: {
            id: 'i1',
            title: 'Test',
            status: 'todo',
            tags: [],
            gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
            isPinned: false,
            documents: [],
            isMerged: null,
            order: 0,
            repositoryId: 'main',
            repositoryPath: '/tmp/cards/i1',
            environment: 'default',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          },
          timeline: []
        },
        { type: 'validation:error', field: 'test', message: 'error' },
        { type: 'theme:update', themeKind: 1 },
        {
          type: 'server:changed',
          baseUrl: 'http://localhost:3001',
          wsUrl: 'ws://localhost:3001/events',
          accessToken: 'token123'
        }
      ];
      expect(messages).toHaveLength(7);
    });
  });

  describe('WebviewAction union type', () => {
    it('should accept all valid action values', () => {
      const actions: WebviewAction[] = ['launchClaude', 'openExternal', 'copyToClipboard'];
      expect(actions).toHaveLength(3);
    });

    it('should be usable in ActionMessage', () => {
      const message: ActionMessage = {
        type: 'action',
        action: 'openExternal',
        payload: { url: 'https://example.com' }
      };
      expect(message.action).toBe('openExternal');
    });
  });

  describe('WebviewState interface', () => {
    it('should have all required properties', () => {
      const state: WebviewState = {
        currentCardId: 'card-123',
        currentRoute: '/cards/123',
        isConnected: true,
        themeKind: 2,
        isLoading: false
      };

      expect(state.currentCardId).toBe('card-123');
      expect(state.currentRoute).toBe('/cards/123');
      expect(state.isConnected).toBe(true);
      expect(state.themeKind).toBe(2);
      expect(state.isLoading).toBe(false);
    });

    it('should allow null for currentCardId', () => {
      const state: WebviewState = {
        currentCardId: null,
        currentRoute: '/cards',
        isConnected: false,
        themeKind: 1,
        isLoading: true
      };

      expect(state.currentCardId).toBeNull();
    });

    it('should accept all valid themeKind values', () => {
      const lightState: WebviewState = {
        currentCardId: null,
        currentRoute: '/',
        isConnected: true,
        themeKind: 1,
        isLoading: false
      };

      const darkState: WebviewState = {
        currentCardId: null,
        currentRoute: '/',
        isConnected: true,
        themeKind: 2,
        isLoading: false
      };

      const highContrastState: WebviewState = {
        currentCardId: null,
        currentRoute: '/',
        isConnected: true,
        themeKind: 3,
        isLoading: false
      };

      expect(lightState.themeKind).toBe(1);
      expect(darkState.themeKind).toBe(2);
      expect(highContrastState.themeKind).toBe(3);
    });
  });

  describe('WebviewDidConnectMessage', () => {
    it('should have type and protocolVersion properties', () => {
      const message: WebviewDidConnectMessage = {
        type: 'webview:didConnect',
        protocolVersion: '1.0.0'
      };

      expect(message.type).toBe('webview:didConnect');
      expect(message.protocolVersion).toBe('1.0.0');
    });
  });

  describe('ApiRequestMessage', () => {
    it('should have type, requestId, method, and path properties', () => {
      const message: ApiRequestMessage = {
        type: 'api:request',
        requestId: 'req-456',
        method: 'POST',
        path: '/cards'
      };

      expect(message.type).toBe('api:request');
      expect(message.requestId).toBe('req-456');
      expect(message.method).toBe('POST');
      expect(message.path).toBe('/cards');
    });

    it('should allow optional body property', () => {
      const messageWithBody: ApiRequestMessage = {
        type: 'api:request',
        requestId: 'req-789',
        method: 'PUT',
        path: '/cards/123',
        body: { title: 'Updated Title' }
      };

      expect(messageWithBody.body).toEqual({ title: 'Updated Title' });
    });

    it('should accept all valid HTTP methods', () => {
      const methods: Array<ApiRequestMessage['method']> = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      expect(methods).toHaveLength(5);
    });
  });

  describe('ApiResponseMessage', () => {
    it('should have type, requestId, and status properties', () => {
      const message: ApiResponseMessage = {
        type: 'api:response',
        requestId: 'req-123',
        status: 200
      };

      expect(message.type).toBe('api:response');
      expect(message.requestId).toBe('req-123');
      expect(message.status).toBe(200);
    });

    it('should allow optional data property', () => {
      const message: ApiResponseMessage = {
        type: 'api:response',
        requestId: 'req-123',
        status: 200,
        data: { result: 'success' }
      };

      expect(message.data).toEqual({ result: 'success' });
    });

    it('should allow optional error property', () => {
      const message: ApiResponseMessage = {
        type: 'api:response',
        requestId: 'req-123',
        status: 500,
        error: 'Internal Server Error'
      };

      expect(message.error).toBe('Internal Server Error');
    });
  });

  describe('NavigateMessage', () => {
    it('should have type and route properties', () => {
      const message: NavigateMessage = {
        type: 'navigate',
        route: '/cards/123'
      };

      expect(message.type).toBe('navigate');
      expect(message.route).toBe('/cards/123');
    });

    it('should allow optional params property', () => {
      const message: NavigateMessage = {
        type: 'navigate',
        route: '/cards/123',
        params: { tab: 'timeline', view: 'detail' }
      };

      expect(message.params).toEqual({ tab: 'timeline', view: 'detail' });
    });
  });

  describe('ActionMessage', () => {
    it('should have type, action, and payload properties', () => {
      const message: ActionMessage = {
        type: 'action',
        action: 'openExternal',
        payload: { url: 'https://example.com' }
      };

      expect(message.type).toBe('action');
      expect(message.action).toBe('openExternal');
      expect(message.payload).toEqual({ url: 'https://example.com' });
    });
  });

  describe('StateUpdateMessage', () => {
    it('should have type and state properties', () => {
      const message: StateUpdateMessage = {
        type: 'state:update',
        state: { isLoading: true, currentRoute: '/cards' }
      };

      expect(message.type).toBe('state:update');
      expect(message.state).toEqual({ isLoading: true, currentRoute: '/cards' });
    });

    it('should accept partial WebviewState', () => {
      const message: StateUpdateMessage = {
        type: 'state:update',
        state: { isConnected: true }
      };

      expect(message.state).toEqual({ isConnected: true });
    });
  });

  describe('EventMessage', () => {
    it('should have type, eventName, and payload properties', () => {
      const message: EventMessage = {
        type: 'event',
        eventName: 'card:statusChanged',
        payload: { cardId: 'card-1', newStatus: 'active' }
      };

      expect(message.type).toBe('event');
      expect(message.eventName).toBe('card:statusChanged');
      expect(message.payload).toEqual({ cardId: 'card-1', newStatus: 'active' });
    });
  });

  describe('LaunchClaudeAction', () => {
    it('should have type and cardId properties', () => {
      const message: LaunchClaudeAction = {
        type: 'action:launchClaude',
        cardId: 'card-999'
      };

      expect(message.type).toBe('action:launchClaude');
      expect(message.cardId).toBe('card-999');
    });
  });

  describe('CardDetailMessage', () => {
    it('should have type, card, and timeline properties', () => {
      const message: CardDetailMessage = {
        type: 'card:detail',
        card: {
          id: 'card-1',
          title: 'Test Card',
          status: 'active',
          tags: ['feature'],
          gates: {
            planRequired: true,
            planApproved: false,
            mergeRequestRequired: true,
            mergeApproved: false
          },
          isPinned: false,
          documents: [],
          isMerged: null,
          order: 0,
          repositoryId: 'main',
          repositoryPath: '/tmp/cards/card-1',
          environment: 'default',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        },
        timeline: [
          {
            type: 'comment',
            id: 'comment-1',
            createdAt: '2024-01-01T00:00:00Z',
            content: { text: 'Test comment' }
          }
        ]
      };

      expect(message.type).toBe('card:detail');
      expect(message.card.id).toBe('card-1');
      expect(message.timeline).toHaveLength(1);
    });
  });

  describe('ValidationErrorMessage', () => {
    it('should have type, field, and message properties', () => {
      const message: ValidationErrorMessage = {
        type: 'validation:error',
        field: 'title',
        message: 'Title must not be empty'
      };

      expect(message.type).toBe('validation:error');
      expect(message.field).toBe('title');
      expect(message.message).toBe('Title must not be empty');
    });
  });

  describe('ThemeUpdateMessage', () => {
    it('should have type and themeKind properties', () => {
      const message: ThemeUpdateMessage = {
        type: 'theme:update',
        themeKind: 2
      };

      expect(message.type).toBe('theme:update');
      expect(message.themeKind).toBe(2);
    });

    it('should accept all valid themeKind values', () => {
      const light: ThemeUpdateMessage = { type: 'theme:update', themeKind: 1 };
      const dark: ThemeUpdateMessage = { type: 'theme:update', themeKind: 2 };
      const highContrast: ThemeUpdateMessage = { type: 'theme:update', themeKind: 3 };

      expect(light.themeKind).toBe(1);
      expect(dark.themeKind).toBe(2);
      expect(highContrast.themeKind).toBe(3);
    });
  });

  describe('ServerChangedMessage', () => {
    it('should have type, baseUrl, wsUrl, and accessToken properties', () => {
      const message: ServerChangedMessage = {
        type: 'server:changed',
        baseUrl: 'http://localhost:3001',
        wsUrl: 'ws://localhost:3001/events',
        accessToken: 'token123'
      };

      expect(message.type).toBe('server:changed');
      expect(message.baseUrl).toBe('http://localhost:3001');
      expect(message.wsUrl).toBe('ws://localhost:3001/events');
      expect(message.accessToken).toBe('token123');
    });
  });
});
