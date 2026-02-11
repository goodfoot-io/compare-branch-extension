import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isProcessAlive } from "../../src/lib/ipc.js";

describe("ipc functions", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isProcessAlive", () => {
    it("returns false for non-existent PID", () => {
      expect(isProcessAlive(999999999)).toBe(false);
    });

    it("returns true for current process", () => {
      expect(isProcessAlive(process.pid)).toBe(true);
    });
  });
});
