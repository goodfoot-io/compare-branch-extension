import * as http from 'node:http';
import split2 from 'split2';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CardsClient } from '../../src/client/cardsClient.js';
import { ApiError } from '../../src/client/types/errors.js';

/**
 * SDK-level integration tests for `CardsClient.openStream()` against a real HTTP server.
 *
 * Each test spins up a minimal Node.js HTTP server on a random port and uses
 * a real `CardsClient` instance (no mocks). The server parses NDJSON body lines
 * via split2, matching the production server's streaming behavior.
 *
 * @summary SDK integration tests for CardsClient.openStream() with real HTTP server
 */

interface StreamServerOptions {
  /** HTTP status to send immediately (before reading body). 200 = read body. */
  rejectWithStatus?: number;
}

interface StreamServer {
  server: http.Server;
  port: number;
  receivedLines: string[];
}

/**
 * Creates a minimal HTTP server that handles POST requests on the stream endpoint.
 *
 * When `rejectWithStatus` is set, the server immediately responds with that status
 * (and does not read the body) — simulating server-side stream rejection (e.g., 409).
 * Otherwise, the server reads the body line-by-line via split2 and responds 200
 * with `{ filename, streamType, lineCount, status: 'completed' }` when the client
 * closes the connection.
 *
 * @param options - Server behavior options.
 * @returns Bound server, its port, and the lines array that accumulates received data.
 */
async function createStreamServer(options: StreamServerOptions = {}): Promise<StreamServer> {
  const receivedLines: string[] = [];

  const server = http.createServer((req, res) => {
    // Extract filename and streamType from URL: /cards/:cardId/streams/:streamType/:filename
    const url = req.url ?? '';
    const match = /\/cards\/[^/]+\/streams\/([^/]+)\/([^/]+)/.exec(url);
    const streamType = match ? decodeURIComponent(match[1] ?? 'unknown') : 'unknown';
    const filename = match ? decodeURIComponent(match[2] ?? 'unknown') : 'unknown';

    if (options.rejectWithStatus !== undefined) {
      // Immediately reject — server sends error before reading body
      res.writeHead(options.rejectWithStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Conflict', code: String(options.rejectWithStatus) }));
      return;
    }

    // Read body line-by-line via split2 (matches production server behavior)
    const lineStream = req.pipe(split2());

    lineStream.on('data', (line: string) => {
      if (line.length > 0) {
        receivedLines.push(line);
      }
    });

    lineStream.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          filename,
          streamType,
          lineCount: receivedLines.length,
          status: 'completed'
        })
      );
    });

    lineStream.on('error', (err: Error) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server did not bind to a port');
  }

  return { server, port: address.port, receivedLines };
}

/**
 * Stops the server and waits for all connections to close.
 *
 * @param server - The HTTP server to stop.
 */
async function stopServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

describe('CardsClient.openStream()', () => {
  // Streaming tests take longer due to real HTTP round-trips
  const TEST_TIMEOUT = 10_000;

  let streamServer: StreamServer;

  beforeEach(async () => {
    streamServer = await createStreamServer();
  });

  afterEach(async () => {
    await stopServer(streamServer.server);
  });

  it(
    'write() delivers lines to server via HTTP POST',
    async () => {
      const { port, receivedLines } = streamServer;
      const client = new CardsClient({ baseUrl: `http://127.0.0.1:${port}`, accessToken: 'test-token' });

      const stream = client.openStream('card-1', 'test-type', 'session.jsonl');
      stream.write('{"type":"init"}');
      stream.write('{"type":"result"}');
      await stream.close();

      expect(receivedLines).toEqual(['{"type":"init"}', '{"type":"result"}']);
    },
    TEST_TIMEOUT
  );

  it(
    'close() ends the request and returns server response',
    async () => {
      const { port } = streamServer;
      const client = new CardsClient({ baseUrl: `http://127.0.0.1:${port}`, accessToken: 'test-token' });

      const stream = client.openStream('card-1', 'test-type', 'session.jsonl');
      stream.write('{"type":"init"}');
      stream.write('{"type":"result"}');
      const result = await stream.close();

      expect(result.filename).toBe('session.jsonl');
      expect(result.streamType).toBe('test-type');
      expect(result.lineCount).toBe(2);
      expect(result.status).toBe('completed');
    },
    TEST_TIMEOUT
  );

  it(
    'multiple rapid writes are received in order',
    async () => {
      const { port, receivedLines } = streamServer;
      const client = new CardsClient({ baseUrl: `http://127.0.0.1:${port}`, accessToken: 'test-token' });

      const stream = client.openStream('card-1', 'test-type', 'session.jsonl');
      // Write 3 lines without any await between them
      stream.write('line-1');
      stream.write('line-2');
      stream.write('line-3');
      await stream.close();

      expect(receivedLines).toEqual(['line-1', 'line-2', 'line-3']);
    },
    TEST_TIMEOUT
  );

  it(
    'write() throws when server rejects with early error (e.g. 409)',
    async () => {
      // Stop the default server and start a 409-rejecting one
      await stopServer(streamServer.server);
      streamServer = await createStreamServer({ rejectWithStatus: 409 });

      const { port } = streamServer;
      const client = new CardsClient({ baseUrl: `http://127.0.0.1:${port}`, accessToken: 'test-token' });

      const stream = client.openStream('card-1', 'test-type', 'session.jsonl');

      // Write a line to initiate the HTTP request body — this causes the fetch to
      // actually send data to the server, which triggers the 409 response. Without
      // an initial write, `fetch` with duplex:'half' holds the connection until the
      // ReadableStream controller is closed or enqueues data.
      stream.write('trigger-request');

      // Wait for earlyError to arrive (~15ms after the server responds 409)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // write() must now throw because earlyError is set
      expect(() => stream.write('any-line')).toThrow(ApiError);
    },
    TEST_TIMEOUT
  );

  it(
    'write after close throws',
    async () => {
      const { port } = streamServer;
      const client = new CardsClient({ baseUrl: `http://127.0.0.1:${port}`, accessToken: 'test-token' });

      const stream = client.openStream('card-1', 'test-type', 'session.jsonl');
      stream.write('first-line');
      await stream.close();

      // controller.close() was called inside close(); enqueue after close throws
      expect(() => stream.write('after-close')).toThrow();
    },
    TEST_TIMEOUT
  );
});
