/**
 * Tests for the scaffold module.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scaffoldProject } from "../src/scaffold.js";

describe("scaffoldProject", () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scaffold-test-"));
    projectDir = path.join(tempDir, "test-hooks");
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("hook name validation", () => {
    it("accepts valid hook names", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue", "EndIssue"],
        outputPath: "dist/hooks.json",
      });

      expect(fs.existsSync(projectDir)).toBe(true);
    });

    it("accepts case-insensitive hook names", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["startissue", "ENDISSUE", "StartTask"],
        outputPath: "dist/hooks.json",
      });

      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "start-issue.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "end-issue.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "start-task.ts"))).toBe(true);
    });

    it("rejects invalid hook names", () => {
      const originalStderr = process.stderr.write;
      const originalExit = process.exit;
      let exitCode: number | undefined;
      let stderrOutput = "";

      // Mock process.exit and stderr
      process.exit = ((code: number) => {
        exitCode = code;
        throw new Error(`process.exit(${code})`);
      }) as never;
      process.stderr.write = ((chunk: string) => {
        stderrOutput += chunk;
        return true;
      }) as never;

      try {
        scaffoldProject({
          directory: projectDir,
          hooks: ["InvalidHook"],
          outputPath: "dist/hooks.json",
        });
      } catch (_error) {
        // Expected to throw due to mocked process.exit
      } finally {
        process.exit = originalExit;
        process.stderr.write = originalStderr;
      }

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain("Invalid hook name(s): InvalidHook");
      expect(stderrOutput).toContain("Valid hook names:");
    });

    it("accepts all valid hook event names", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue", "StartTask", "EndTask", "EndIssue", "StartInterview", "EndInterview"],
        outputPath: "dist/hooks.json",
      });

      expect(fs.existsSync(path.join(projectDir, "src", "start-issue.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "start-task.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "end-task.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "end-issue.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "start-interview.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "end-interview.ts"))).toBe(true);
    });
  });

  describe("directory structure", () => {
    it("creates project directory structure", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue"],
        outputPath: "dist/hooks.json",
      });

      expect(fs.existsSync(projectDir)).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "test"))).toBe(true);
    });

    it("fails if directory already exists", () => {
      const originalStderr = process.stderr.write;
      const originalExit = process.exit;
      let exitCode: number | undefined;
      let stderrOutput = "";

      // Create the directory first
      fs.mkdirSync(projectDir, { recursive: true });

      // Mock process.exit and stderr
      process.exit = ((code: number) => {
        exitCode = code;
        throw new Error(`process.exit(${code})`);
      }) as never;
      process.stderr.write = ((chunk: string) => {
        stderrOutput += chunk;
        return true;
      }) as never;

      try {
        scaffoldProject({
          directory: projectDir,
          hooks: ["StartIssue"],
          outputPath: "dist/hooks.json",
        });
      } catch (_error) {
        // Expected to throw due to mocked process.exit
      } finally {
        process.exit = originalExit;
        process.stderr.write = originalStderr;
      }

      expect(exitCode).toBe(1);
      expect(stderrOutput).toContain("Directory already exists");
    });
  });

  describe("file generation", () => {
    it("generates package.json with correct dependencies", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue"],
        outputPath: "dist/hooks.json",
      });

      const packageJsonPath = path.join(projectDir, "package.json");
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.name).toBe("test-hooks");
      expect(packageJson.type).toBe("module");
      expect(packageJson.dependencies).toHaveProperty("@goodfoot/compare-branch-hooks");
      expect(packageJson.scripts.build).toContain("compare-branch-hooks");
      expect(packageJson.scripts.build).toContain("dist/hooks.json");
    });

    it("generates hook files for each requested hook", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue", "EndTask"],
        outputPath: "dist/hooks.json",
      });

      const startIssuePath = path.join(projectDir, "src", "start-issue.ts");
      const endTaskPath = path.join(projectDir, "src", "end-task.ts");

      expect(fs.existsSync(startIssuePath)).toBe(true);
      expect(fs.existsSync(endTaskPath)).toBe(true);

      const startIssueContent = fs.readFileSync(startIssuePath, "utf-8");
      expect(startIssueContent).toContain("startIssueHook");
      expect(startIssueContent).toContain("StartIssue hook triggered");
      expect(startIssueContent).not.toContain("return"); // No return statement

      const endTaskContent = fs.readFileSync(endTaskPath, "utf-8");
      expect(endTaskContent).toContain("endTaskHook");
      expect(endTaskContent).toContain("EndTask hook triggered");
      expect(endTaskContent).not.toContain("return"); // No return statement
    });

    it("generates test files for each hook", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue", "StartTask"],
        outputPath: "dist/hooks.json",
      });

      const startIssueTestPath = path.join(projectDir, "test", "start-issue.test.ts");
      const startTaskTestPath = path.join(projectDir, "test", "start-task.test.ts");

      expect(fs.existsSync(startIssueTestPath)).toBe(true);
      expect(fs.existsSync(startTaskTestPath)).toBe(true);

      const startIssueTestContent = fs.readFileSync(startIssueTestPath, "utf-8");
      expect(startIssueTestContent).toContain('import hook from "../src/start-issue.js"');
      expect(startIssueTestContent).toContain('describe("StartIssue Hook"');
      expect(startIssueTestContent).toContain("issueId:");
      expect(startIssueTestContent).toContain("executionWrapperPid:");
      expect(startIssueTestContent).toContain("hookIpcSocket:");
      expect(startIssueTestContent).not.toContain("taskId:"); // Issue hook doesn't have taskId

      const startTaskTestContent = fs.readFileSync(startTaskTestPath, "utf-8");
      expect(startTaskTestContent).toContain('import hook from "../src/start-task.js"');
      expect(startTaskTestContent).toContain('describe("StartTask Hook"');
      expect(startTaskTestContent).toContain("taskId:"); // Task hook has taskId
      expect(startTaskTestContent).toContain("interactiveMode:"); // Task hook has interactiveMode
    });

    it("generates configuration files", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue"],
        outputPath: "dist/hooks.json",
      });

      expect(fs.existsSync(path.join(projectDir, "tsconfig.json"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "biome.json"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "vitest.config.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "CLAUDE.md"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, ".gitignore"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "README.md"))).toBe(true);
    });

    it("generates README with hook list", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue", "EndIssue"],
        outputPath: "dist/hooks.json",
      });

      const readmePath = path.join(projectDir, "README.md");
      const readmeContent = fs.readFileSync(readmePath, "utf-8");

      expect(readmeContent).toContain("# test-hooks");
      expect(readmeContent).toContain("`StartIssue`");
      expect(readmeContent).toContain("`EndIssue`");
      expect(readmeContent).toContain("@goodfoot/compare-branch-hooks");
    });
  });

  describe("kebab-case conversion", () => {
    it("converts PascalCase to kebab-case correctly", () => {
      scaffoldProject({
        directory: projectDir,
        hooks: ["StartIssue", "EndTask", "StartInterview"],
        outputPath: "dist/hooks.json",
      });

      expect(fs.existsSync(path.join(projectDir, "src", "start-issue.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "end-task.ts"))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, "src", "start-interview.ts"))).toBe(true);
    });
  });
});
