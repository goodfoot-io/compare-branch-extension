import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function validateBranchName(name: string): void {
  const branchNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;
  if (!branchNameRegex.test(name)) {
    throw new Error('Error: Invalid branch name format.');
  }
}

export function isNestedUnder(dir: string, parentSet: Set<string>): boolean {
  let current = dir;
  while (current.includes('/')) {
    current = current.substring(0, current.lastIndexOf('/'));
    if (parentSet.has(current)) {
      return true;
    }
  }
  return false;
}

export function isInternalSymlink(target: string): boolean {
  const INTERNAL_PREFIXES = [
    '../../../packages/',
    '../../packages/',
    '../packages/',
    '../../../.yarn/',
    '../../.yarn/',
    '../.yarn/',
    '../../../apps/',
    '../../apps/',
    '../apps/',
    '../../../libs/',
    '../../libs/',
    '../libs/'
  ];
  return INTERNAL_PREFIXES.some((prefix) => target.startsWith(prefix));
}

interface CreateWorktreeResult {
  branch: string;
  worktree: string;
  baseSha: string;
  reroutedSymlinks?: number;
}

export async function createWorktree(branchName: string): Promise<CreateWorktreeResult> {
  validateBranchName(branchName);

  const { sourceRoot, repoRoot } = await findGitRoots(process.cwd());
  const startPoint = await resolveHead(sourceRoot);
  const worktreeDir = path.join(repoRoot, '.worktrees', branchName);

  const [worktreeExists, branchExists] = await Promise.all([
    checkWorktreeExists(repoRoot, worktreeDir),
    checkBranchExists(repoRoot, branchName)
  ]);

  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }

  await addWorktree({ repoRoot, worktreeDir, branchName, branchExists, startPoint });

  const ignored = await discoverIgnoredPaths(sourceRoot);
  await copyExistingSymlinks(sourceRoot, worktreeDir);
  await symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored });

  const reroutedCount = await rerouteAllNodeModules({ sourceRoot, worktreeDir, repoRoot });

  const [, baseSha] = await Promise.all([
    updateGitExclude({ worktreeDir, repoRoot, directories: ignored.directories, files: ignored.files }),
    resolveHead(worktreeDir)
  ]);

  const result: CreateWorktreeResult = {
    branch: branchName,
    worktree: worktreeDir,
    baseSha
  };

  if (reroutedCount > 0) {
    result.reroutedSymlinks = reroutedCount;
  }

  return result;
}

interface GitRoots {
  sourceRoot: string;
  repoRoot: string;
}

export async function findGitRoots(startDir: string): Promise<GitRoots> {
  let currentDir = path.resolve(startDir);
  while (currentDir !== '/') {
    const gitPath = path.join(currentDir, '.git');
    try {
      const stats = await fs.lstat(gitPath);
      if (stats.isDirectory()) {
        return {
          sourceRoot: currentDir,
          repoRoot: currentDir
        };
      }
      if (stats.isFile()) {
        const gitFileContent = await fs.readFile(gitPath, 'utf-8');
        const gitdirLine = gitFileContent.trim();
        const gitdirPath = gitdirLine.replace(/^gitdir:\s*/, '');
        const mainGitDir = gitdirPath.replace(/\/worktrees\/[^/]+$/, '');
        const repoRoot = mainGitDir.replace(/\/\.git$/, '');
        return {
          sourceRoot: currentDir,
          repoRoot
        };
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Not in a git repository');
}

export async function resolveHead(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd, timeout: 5_000 });
  return stdout.trim();
}

export async function checkWorktreeExists(repoRoot: string, worktreeDir: string): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['worktree', 'list'], { cwd: repoRoot, timeout: 30_000 });
  return stdout.includes(worktreeDir);
}

export async function checkBranchExists(repoRoot: string, branchName: string): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['branch', '--list', branchName], {
    cwd: repoRoot,
    timeout: 30_000
  });
  return stdout.trim().length > 0;
}

interface AddWorktreeOptions {
  repoRoot: string;
  worktreeDir: string;
  branchName: string;
  branchExists: boolean;
  startPoint: string;
}

export async function addWorktree(opts: AddWorktreeOptions): Promise<void> {
  const args = opts.branchExists
    ? ['worktree', 'add', opts.worktreeDir, opts.branchName]
    : ['worktree', 'add', '-b', opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync('git', args, { cwd: opts.repoRoot, timeout: 30_000 });
}

interface IgnoredPaths {
  directories: string[];
  files: string[];
}

export async function discoverIgnoredPaths(sourceRoot: string): Promise<IgnoredPaths> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', sourceRoot, 'ls-files', '--ignored', '--exclude-standard', '--directory', '--others'],
    { cwd: sourceRoot, timeout: 30_000 }
  );

  const lines = stdout.split('\n').filter((line) => line.length > 0 && !line.startsWith('.worktrees'));
  const directories = lines.filter((l) => l.endsWith('/')).map((l) => l.slice(0, -1));
  const files = lines.filter((l) => !l.endsWith('/'));

  return { directories, files };
}

interface SymlinkIgnoredPathsOptions {
  sourceRoot: string;
  worktreeDir: string;
  ignored: IgnoredPaths;
}

interface SymlinkIgnoredPathsResult {
  dirCount: number;
  fileCount: number;
}

export async function symlinkIgnoredPaths(opts: SymlinkIgnoredPathsOptions): Promise<SymlinkIgnoredPathsResult> {
  const { sourceRoot, worktreeDir, ignored } = opts;
  const dirSet = new Set(ignored.directories);
  const nonNestedDirs = ignored.directories.filter((dir) => !isNestedUnder(dir, dirSet));

  const createDirSymlink = async (dir: string): Promise<boolean> => {
    try {
      const sourcePath = path.join(sourceRoot, dir);
      try {
        await fs.lstat(sourcePath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}\n`
        );
        return false;
      }
      const destPath = path.join(worktreeDir, dir);
      const parentDir = path.dirname(dir);
      if (parentDir !== '.') {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs.symlink(sourcePath, destPath);
      return true;
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' || code === 'ENOENT') {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return false;
    }
  };

  const createFileSymlink = async (file: string): Promise<boolean> => {
    try {
      const sourcePath = path.join(sourceRoot, file);
      try {
        await fs.lstat(sourcePath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}\n`
        );
        return false;
      }
      const destPath = path.join(worktreeDir, file);
      const parentDir = path.dirname(file);
      if (parentDir !== '.') {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs.symlink(sourcePath, destPath);
      return true;
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' || code === 'ENOENT') {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return false;
    }
  };

  const dirResults = await Promise.all(nonNestedDirs.map(createDirSymlink));
  const fileResults = await Promise.all(ignored.files.map(createFileSymlink));

  const dirCount = dirResults.filter((r) => r).length;
  const fileCount = fileResults.filter((r) => r).length;

  return { dirCount, fileCount };
}

export async function copyExistingSymlinks(sourceRoot: string, worktreeDir: string): Promise<number> {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  const symlinks = entries.filter((e) => e.isSymbolicLink() && e.name !== '.git' && e.name !== '.worktrees');

  const copySymlink = async (name: string): Promise<boolean> => {
    try {
      const destPath = path.join(worktreeDir, name);
      await fs.lstat(destPath);
      return false;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        const sourceLinkPath = path.join(sourceRoot, name);
        const destPath = path.join(worktreeDir, name);
        await fs.symlink(sourceLinkPath, destPath);
        return true;
      }
      return false;
    }
  };

  const results = await Promise.all(symlinks.map((e) => copySymlink(e.name)));
  return results.filter((r) => r).length;
}

interface RerouteNodeModulesOptions {
  sourceNodeModules: string;
  destNodeModules: string;
}

export async function rerouteNodeModules(opts: RerouteNodeModulesOptions): Promise<number> {
  const { sourceNodeModules, destNodeModules } = opts;

  try {
    await fs.lstat(sourceNodeModules);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  try {
    const destStats = await fs.lstat(destNodeModules);
    if (destStats.isSymbolicLink()) {
      await fs.unlink(destNodeModules);
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(destNodeModules, { recursive: true });

  const entries = await fs.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry): Promise<number> => {
      const sourcePath = path.join(sourceNodeModules, entry.name);
      const destPath = path.join(destNodeModules, entry.name);

      if (entry.isSymbolicLink()) {
        const target = await fs.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await fs.symlink(target, destPath);
          return 1;
        } else {
          await fs.symlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith('@')) {
        await fs.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry): Promise<number> => {
            const scopeSourcePath = path.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path.join(destPath, scopeEntry.name);

            if (scopeEntry.isSymbolicLink()) {
              const target = await fs.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await fs.symlink(target, scopeDestPath);
                return 1;
              } else {
                await fs.symlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await fs.symlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await fs.symlink(sourcePath, destPath);
        return 0;
      }
    })
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

interface RerouteAllNodeModulesOptions {
  sourceRoot: string;
  worktreeDir: string;
  repoRoot: string;
}

export async function rerouteAllNodeModules(opts: RerouteAllNodeModulesOptions): Promise<number> {
  const { sourceRoot, worktreeDir, repoRoot } = opts;

  let packageJson: { workspaces?: string[] };
  try {
    const packageJsonContent = await fs.readFile(path.join(repoRoot, 'package.json'), 'utf-8');
    packageJson = JSON.parse(packageJsonContent);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  if (!packageJson.workspaces) {
    return 0;
  }

  let totalCount = 0;

  totalCount += await rerouteNodeModules({
    sourceNodeModules: path.join(sourceRoot, 'node_modules'),
    destNodeModules: path.join(worktreeDir, 'node_modules')
  });

  const packagesDir = path.join(sourceRoot, 'packages');
  try {
    const packageEntries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path.join(packagesDir, entry.name, 'node_modules');
        let nodeModulesExists = false;
        try {
          await fs.lstat(pkgNodeModules);
          nodeModulesExists = true;
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
        if (nodeModulesExists) {
          const destPackageDir = path.join(worktreeDir, 'packages', entry.name);
          await fs.mkdir(destPackageDir, { recursive: true });
          totalCount += await rerouteNodeModules({
            sourceNodeModules: pkgNodeModules,
            destNodeModules: path.join(destPackageDir, 'node_modules')
          });
        }
      }
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return totalCount;
}

interface UpdateGitExcludeOptions {
  worktreeDir: string;
  repoRoot: string;
  directories: string[];
  files: string[];
}

export async function updateGitExclude(opts: UpdateGitExcludeOptions): Promise<void> {
  const { worktreeDir, repoRoot, directories, files } = opts;

  const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--git-dir'], {
    timeout: 5_000
  });
  const excludePath = path.join(gitDir.trim(), 'info', 'exclude');
  await fs.mkdir(path.dirname(excludePath), { recursive: true });

  const lines = ['# Symlinks created by instant-worktree'];

  for (const dir of directories) {
    if (!dir) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, dir));
      if (stats.isSymbolicLink()) lines.push(dir);
    } catch {
      // skip
    }
  }

  for (const file of files) {
    if (!file) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, file));
      if (stats.isSymbolicLink()) lines.push(file);
    } catch {
      // skip
    }
  }

  await fs.appendFile(excludePath, `${lines.join('\n')}\n`);

  try {
    await execFileAsync('git', ['-C', repoRoot, 'config', 'extensions.worktreeConfig', 'true'], { timeout: 5_000 });
  } catch {
    // skip
  }

  try {
    await execFileAsync('git', ['-C', worktreeDir, 'config', '--worktree', 'core.excludesFile', excludePath], {
      timeout: 5_000
    });
  } catch {
    // skip
  }
}

// CLI entrypoint
if (process.argv[1]?.endsWith('create-worktree.mjs')) {
  const branchName = process.argv[2];
  if (!branchName) {
    console.error('Usage: node create-worktree.mjs <branch-name>');
    process.exit(2);
  }
  createWorktree(branchName)
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    });
}
