/**
 * Implements uuid7 behavior for the bin area.
 * The module captures domain rules in one place so callers can compose workflows without
 * duplicating edge-case handling.
 *
 * @summary Uuid7 logic for bin
 */

/**
 * Generates a UUIDv7 string using current time and random bytes.
 *
 * The first 48 bits encode millisecond time, then version and variant bits are
 * applied per RFC UUID layout requirements.
 *
 * @returns Canonical lowercase UUID string in 8-4-4-4-12 format.
 */
export function generateUUID7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Embed 48-bit millisecond timestamp in first 6 bytes
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Set version 7
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;

  // Set variant 10xx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

if (process.argv[1]?.endsWith('uuid7.mjs')) {
  console.log(generateUUID7());
}
