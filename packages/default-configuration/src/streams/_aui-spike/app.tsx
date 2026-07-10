/**
 * Throwaway spike app proving assistant-ui builds through the Bun HTML
 * bundler and renders headlessly (no @assistant-ui/react-ui) with a custom
 * ExternalStoreRuntime, GFM markdown, a reasoning part, a tool-call part, and
 * a data part with a custom renderer.
 *
 * @summary assistant-ui integration spike, not a production renderer
 */

import type { ThreadMessageLike } from '@assistant-ui/react';
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import React, { type FC } from 'react';
import { createRoot } from 'react-dom/client';
import remarkGfm from 'remark-gfm';

const MARKDOWN_SAMPLE = `Here is a summary:

| Metric | Value |
| --- | --- |
| Files changed | 3 |
| Lines added | 42 |

\`\`\`ts
function greet(name: string): string {
  return \`hello, \${name}\`;
}
\`\`\`

- first item
- second item
- third item
`;

const SPIKE_MESSAGES: readonly ThreadMessageLike[] = [
  {
    id: 'm1',
    role: 'user',
    content: 'Can you show me an example with a table, code, and a list?'
  },
  {
    id: 'm2',
    role: 'assistant',
    content: [{ type: 'text', text: MARKDOWN_SAMPLE }]
  },
  {
    id: 'm3',
    role: 'assistant',
    content: [
      { type: 'reasoning', text: 'Checking whether the file exists before reading it.' },
      { type: 'text', text: "I'll read the file first." }
    ]
  },
  {
    id: 'm4',
    role: 'assistant',
    content: [
      {
        type: 'tool-call',
        toolCallId: 'call_1',
        toolName: 'read-file',
        args: { path: '/tmp/example.txt' },
        result: 'file contents: hello world'
      }
    ]
  },
  {
    id: 'm5',
    role: 'user',
    content: 'Anything else interesting?'
  },
  {
    id: 'm6',
    role: 'assistant',
    content: [{ type: 'data', name: 'status-summary', data: { label: 'Build status', value: 'passing' } }]
  }
];

const TextPart: FC = () => (
  <div className="spike-markdown">
    <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} />
  </div>
);

const ReasoningPart: FC<{ text: string }> = ({ text }) => <div className="spike-reasoning">{text}</div>;

const ReadFileTool: FC<{ args: { path: string }; result?: unknown }> = ({ args, result }) => (
  <div className="spike-tool-call">
    <strong>read-file</strong>
    <div>path: {args.path}</div>
    {result !== undefined ? <div>result: {String(result)}</div> : null}
  </div>
);

const StatusSummaryData: FC<{ data: { label: string; value: string } }> = ({ data }) => (
  <div className="spike-data">
    {data.label}: {data.value}
  </div>
);

const SpikeMessage: FC = () => (
  <MessagePrimitive.Root className="spike-message">
    <MessagePrimitive.Content
      components={{
        Text: TextPart,
        Reasoning: ReasoningPart,
        tools: { by_name: { 'read-file': ReadFileTool } },
        data: { by_name: { 'status-summary': StatusSummaryData } }
      }}
    />
  </MessagePrimitive.Root>
);

export const App: FC = () => {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: SPIKE_MESSAGES,
    convertMessage: (message) => message,
    onNew: async () => {
      // Spike has no composer mounted; onNew is never invoked.
    }
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Viewport>
          <ThreadPrimitive.Messages
            components={{
              UserMessage: SpikeMessage,
              AssistantMessage: SpikeMessage
            }}
          />
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
};

if (typeof document !== 'undefined') {
  const rootEl = document.getElementById('stream-root');
  if (rootEl) {
    createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
