/**
 * Re-export barrel for API discovery.
 *
 * The extension test bundler resolves `@cards/sdk/client/discovery` by
 * convention to `sdk/src/client/discovery.ts`. The canonical implementation
 * lives in {@link module:client/api-discovery api-discovery.ts}; this file
 * bridges the package.json export path to the implementation file.
 *
 * @summary Re-export barrel for API discovery
 * @module client/discovery
 */

export { createCardsClient, discoverApiInfo } from './api-discovery.js';
