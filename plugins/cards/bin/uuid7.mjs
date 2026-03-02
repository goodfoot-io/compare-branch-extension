// src/bin/uuid7.ts
function generateUUID7() {
  const now = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[0] = now / 2 ** 40 & 255;
  bytes[1] = now / 2 ** 32 & 255;
  bytes[2] = now / 2 ** 24 & 255;
  bytes[3] = now / 2 ** 16 & 255;
  bytes[4] = now / 2 ** 8 & 255;
  bytes[5] = now & 255;
  bytes[6] = bytes[6] & 15 | 112;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
if (process.argv[1]?.endsWith("uuid7.mjs")) {
  console.log(generateUUID7());
}
export {
  generateUUID7
};
