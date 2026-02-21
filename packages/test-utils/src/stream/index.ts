/**
 * Test harness for executing stream transforms in isolated worker threads.
 * Accepts inline transform code, manages worker lifecycle automatically,
 * and captures console output for assertions.
 *
 * @summary Test stream transforms with automatic worker lifecycle and log capture
 */

export {
  type CreateStreamInitContextOptions,
  createStreamInitContext,
  type LogEntry,
  TestStreamTransformHarness,
  type TestStreamTransformHarnessOptions
} from './TestStreamTransformHarness.js';
