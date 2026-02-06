/**
 * End-to-end tests for claude-code-session stream transform serialization.
 */

import { describe, expect, it } from 'vitest';
import {
  claudeCodeSessionTransform,
  defineStreamTransform,
  type SettingsConfig,
  serializeSettings
} from '../../src/index.js';

describe('claude-code-session transform serialization', () => {
  it('serializes to streamTransform-claude-code-session.js path', () => {
    const config: SettingsConfig = {
      environments: {
        default: {
          version: 1,
          actions: [],
          streams: {
            'claude-code-session': {
              version: 1,
              transform: claudeCodeSessionTransform
            }
          }
        }
      }
    };

    const settings = serializeSettings(config);
    const streamDef = settings.environments.default.streams?.['claude-code-session'];

    expect(streamDef).toBeDefined();
    expect(streamDef?.transform.path).toBe('streamTransform-claude-code-session.js');
  });

  it('coexists with other streams in same environment', () => {
    const jsonlTransform = defineStreamTransform({ streamType: 'jsonl' }, async (line: string) => line);

    const config: SettingsConfig = {
      environments: {
        default: {
          version: 1,
          actions: [],
          streams: {
            'claude-code-session': {
              version: 1,
              transform: claudeCodeSessionTransform
            },
            'jsonl-stream': {
              version: 1,
              transform: jsonlTransform
            }
          }
        }
      }
    };

    const settings = serializeSettings(config);
    const streams = settings.environments.default.streams;

    expect(streams).toBeDefined();
    expect(Object.keys(streams!)).toHaveLength(2);
    expect(streams!['claude-code-session']).toBeDefined();
    expect(streams!['jsonl-stream']).toBeDefined();
    expect(streams!['claude-code-session'].transform.path).toBe('streamTransform-claude-code-session.js');
    expect(streams!['jsonl-stream'].transform.path).toBe('streamTransform-jsonl.js');
  });

  it('has correct metadata (streamType and factoryType)', () => {
    expect(claudeCodeSessionTransform.streamType).toBe('claude-code-session');
    expect(claudeCodeSessionTransform.factoryType).toBe('streamTransform');
  });
});
