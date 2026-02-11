/**
 * Tests for the Stop hook.
 */

import { Logger } from "@goodfoot/claude-code-hooks";
import { describe, expect, it } from "vitest";
import hook from "../src/stop.js";

// Logger is silent by default (no stdout/stderr output) — no mocking needed
const logger = new Logger();

describe("Stop Hook", () => {
  it("exports a valid hook function", () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe("function");
  });

  it("has correct hookEventName metadata", () => {
    expect(hook.hookEventName).toBe("Stop");
  });

  it("returns a valid output shape", async () => {
    const mockInput = {} as Parameters<typeof hook>[0];
    const context = { logger };

    const result = await hook(mockInput, context);

    // Verify output has expected structure
    expect(result).toBeDefined();
    expect(result).toHaveProperty("_type", "Stop");
    expect(result).toHaveProperty("stdout");
    expect(typeof result.stdout).toBe("object");
  });
});
