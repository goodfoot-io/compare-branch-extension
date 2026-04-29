// src/worktree.ts
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path2 from "node:path";
import { promisify } from "node:util";

// src/cards-config.ts
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import * as path from "node:path";
var CARDS_DIR_NAME = ".cards";
function resolveGlobalCardsConfigDir() {
  const cardsHome = process.env["CARDS_HOME"];
  if (cardsHome) {
    return cardsHome;
  }
  const xdgDataHome = process.env["XDG_DATA_HOME"];
  if (xdgDataHome) {
    return path.join(xdgDataHome, CARDS_DIR_NAME);
  }
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, CARDS_DIR_NAME);
  }
  return path.join(homedir(), CARDS_DIR_NAME);
}
function resolveWorktreesRoot() {
  const overrideRoot = process.env["CARDS_WORKTREES_DIR"];
  if (overrideRoot) {
    return overrideRoot;
  }
  return path.join(resolveGlobalCardsConfigDir(), "worktrees");
}

// src/worktree.ts
var WorktreeScopeError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "WorktreeScopeError";
  }
};
var execFileAsync = promisify(execFile);
async function removeWorktree(worktreePath2) {
  if (typeof worktreePath2 !== "string" || worktreePath2.length === 0) {
    throw new WorktreeScopeError("removeWorktree: worktreePath must be a non-empty string");
  }
  const worktreesRoot = path2.resolve(resolveWorktreesRoot());
  const resolved = path2.resolve(worktreePath2);
  let canonical;
  try {
    canonical = await fs.realpath(resolved);
  } catch (error) {
    if (error.code === "ENOENT") {
      canonical = resolved;
    } else {
      throw error;
    }
  }
  if (!canonical.startsWith(worktreesRoot + path2.sep)) {
    throw new WorktreeScopeError(`removeWorktree: path is outside the Cards worktrees root: ${canonical}`);
  }
  const gitFilePath = path2.join(resolved, ".git");
  let repoRoot;
  try {
    const stats = await fs.lstat(gitFilePath);
    if (stats.isFile()) {
      const content = await fs.readFile(gitFilePath, "utf-8");
      const gitdirPath = content.trim().replace(/^gitdir:\s*/, "");
      const mainGitDir = gitdirPath.replace(/\/worktrees\/[^/]+$/, "");
      repoRoot = mainGitDir.replace(/\/\.git$/, "");
    } else if (stats.isDirectory()) {
      repoRoot = resolved;
    } else {
      throw new Error(`removeWorktree: unexpected .git entry type at ${gitFilePath}`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  await execFileAsync("git", ["worktree", "remove", "--force", resolved], {
    cwd: repoRoot,
    timeout: 3e4
  });
  await fs.rm(resolved, { recursive: true, force: true });
  await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot, timeout: 3e4 });
}

// src/bin/remove-worktree.ts
var USAGE = "Usage: remove-worktree <path>\n";
var args = process.argv.slice(2);
var worktreePath;
for (const arg of args) {
  if (arg === "-h" || arg === "--help") {
    process.stdout.write(USAGE);
    process.exit(0);
  } else if (worktreePath === void 0) {
    worktreePath = arg;
  } else {
    process.stderr.write(USAGE);
    process.exit(2);
  }
}
if (!worktreePath) {
  process.stderr.write(USAGE);
  process.exit(2);
}
removeWorktree(worktreePath).then(() => {
  process.exit(0);
}).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}
`);
  process.exit(2);
});
