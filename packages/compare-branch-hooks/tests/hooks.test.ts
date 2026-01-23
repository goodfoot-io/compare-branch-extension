/**
 * Tests for hook factory functions.
 */

import { describe, expect, it, vi } from "vitest";
import {
  endInterviewHook,
  endIssueHook,
  endTaskHook,
  type HookContext,
  type HookFunction,
  startInterviewHook,
  startIssueHook,
  startTaskHook,
} from "../src/hooks.js";
import { Logger } from "../src/logger.js";
import type { StartIssueInput, StartTaskInput } from "../src/types.js";

// Create a mock context
const createMockContext = (): HookContext => ({
  logger: new Logger(),
});

describe("Hook Factories", () => {
  describe("startIssueHook", () => {
    it("creates a hook function with correct hookEventName", () => {
      const hook = startIssueHook({}, () => {});
      expect(hook.hookEventName).toBe("StartIssue");
    });

    it("attaches timeout from config", () => {
      const hook = startIssueHook({ timeout: 5000 }, () => {});
      expect(hook.timeout).toBe(5000);
    });

    it("has undefined timeout when not configured", () => {
      const hook = startIssueHook({}, () => {});
      expect(hook.timeout).toBeUndefined();
    });

    it("calls handler with input and context", async () => {
      const handler = vi.fn();
      const hook = startIssueHook({}, handler);
      const input: StartIssueInput = {
        issueId: "issue-1",
        executionWrapperPid: 123,
        hookIpcSocket: "/tmp/socket",
      };
      const context = createMockContext();

      await hook(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });

    it("awaits async handlers", async () => {
      let completed = false;
      const hook = startIssueHook({}, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed = true;
      });

      const input: StartIssueInput = {
        issueId: "issue-1",
        executionWrapperPid: 123,
        hookIpcSocket: "/tmp/socket",
      };

      await hook(input, createMockContext());
      expect(completed).toBe(true);
    });
  });

  describe("startTaskHook", () => {
    it("creates a hook function with correct hookEventName", () => {
      const hook = startTaskHook({}, () => {});
      expect(hook.hookEventName).toBe("StartTask");
    });

    it("receives task-specific input", async () => {
      const handler = vi.fn();
      const hook = startTaskHook({}, handler);
      const input: StartTaskInput = {
        issueId: "issue-1",
        taskId: "task-1",
        executionWrapperPid: 123,
        hookIpcSocket: "/tmp/socket",
        interactiveMode: true,
      };

      await hook(input, createMockContext());

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: "task-1",
          interactiveMode: true,
        }),
        expect.anything(),
      );
    });
  });

  describe("endTaskHook", () => {
    it("creates a hook function with correct hookEventName", () => {
      const hook = endTaskHook({}, () => {});
      expect(hook.hookEventName).toBe("EndTask");
    });
  });

  describe("endIssueHook", () => {
    it("creates a hook function with correct hookEventName", () => {
      const hook = endIssueHook({}, () => {});
      expect(hook.hookEventName).toBe("EndIssue");
    });
  });

  describe("startInterviewHook", () => {
    it("creates a hook function with correct hookEventName", () => {
      const hook = startInterviewHook({}, () => {});
      expect(hook.hookEventName).toBe("StartInterview");
    });
  });

  describe("endInterviewHook", () => {
    it("creates a hook function with correct hookEventName", () => {
      const hook = endInterviewHook({}, () => {});
      expect(hook.hookEventName).toBe("EndInterview");
    });
  });

  describe("HookFunction type", () => {
    it("is callable", async () => {
      const hook: HookFunction<StartIssueInput> = startIssueHook({}, () => {});
      expect(typeof hook).toBe("function");
    });

    it("has required metadata properties", () => {
      const hook = startTaskHook({ timeout: 10000 }, () => {});
      expect(hook).toHaveProperty("hookEventName");
      expect(hook).toHaveProperty("timeout");
    });
  });
});
