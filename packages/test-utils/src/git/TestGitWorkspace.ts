/**
 * Test utility for creating real git workspace repositories.
 *
 * Why: repository identity resolution logic depends on actual git metadata,
 * so tests need a realistic workspace on disk.
 *
 * Behavior: creates a git repo with a minimal file set and an initial commit.
 *
 * Constraint: performs filesystem and git operations; call `destroy()` to
 * clean up any created directories.
 *
 *
 * @summary Test utility for creating real git workspace repositories
 * @module test-utils/git/TestGitWorkspace
 */
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'fs-extra';
import { type SimpleGit, simpleGit } from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates real Git repositories that simulate a user's project workspace.
 *
 * Why: identity resolution tests need a workspace path that behaves like a
 * real git repo, complete with commits and (optionally) a remote.
 *
 * This is different from TestCardRepository:
 * - TestCardRepository: Creates the card repos directory where cards are stored
 * - TestGitWorkspace: Creates a git repo that simulates the user's project
 *
 * Behavior: writes a README and .gitignore, makes an initial commit, and can
 * optionally configure a remote.
 *
 * @example
 * ```typescript
 * const workspace = new TestGitWorkspace();
 * await workspace.create();
 *
 * // Use workspace.getPath() as the workspacePath parameter
 * await store.listCards({ workspacePath: workspace.getPath() });
 *
 * workspace.destroy();
 * ```
 */
export class TestGitWorkspace {
  private workspacePath: string | null = null;
  private git: SimpleGit | null = null;

  /**
   * Gets the path to the workspace directory.
   *
   * @returns Absolute path to the created workspace directory
   * @throws If workspace not created
   */
  getPath(): string {
    if (!this.workspacePath) {
      throw new Error('Workspace not created');
    }
    return this.workspacePath;
  }

  /**
   * Gets the SimpleGit instance for this workspace.
   *
   * @returns SimpleGit client bound to this workspace repository
   * @throws If workspace not created
   */
  getGit(): SimpleGit {
    if (!this.git) {
      throw new Error('Workspace not created');
    }
    return this.git;
  }

  /**
   * Creates a new test git workspace.
   *
   * Behavior: uses `TEST_WORKSPACE` if provided, otherwise the OS temp folder.
   *
   * @param options Optional configuration
   * @param options.remoteUrl Optional remote URL to configure as `origin`
   * @returns The path to the workspace directory
   */
  async create(options?: {
    /** Optional remote URL to set as origin */
    remoteUrl?: string;
  }): Promise<string> {
    const workspaceId = uuidv4();
    const testWorkspace = process.env['TEST_WORKSPACE'] || path.join(os.tmpdir(), 'test-utils-workspace');
    await fs.ensureDir(testWorkspace);
    this.workspacePath = path.join(testWorkspace, `test-workspace-${workspaceId}`);
    await fs.ensureDir(this.workspacePath);

    // Initialize git repository
    this.git = simpleGit(this.workspacePath);
    await this.git.init();
    await this.git.branch(['-m', 'main']);
    await this.git.addConfig('user.name', 'Test User');
    await this.git.addConfig('user.email', 'test@example.com');

    // Create initial files
    await fs.writeFile(path.join(this.workspacePath, 'README.md'), '# Test Workspace\n');
    await fs.writeFile(path.join(this.workspacePath, '.gitignore'), 'node_modules/\n');

    // Create initial commit
    await this.git.add('.');
    await this.git.commit('Repository initializes.');

    // Set remote if provided
    if (options?.remoteUrl) {
      await this.git.addRemote('origin', options.remoteUrl);
    }

    return this.workspacePath;
  }

  /**
   * Creates and commits a file in the workspace.
   *
   * Behavior: ensures intermediate directories exist, stages the file, and
   * creates a commit with a default message if none is supplied.
   *
   * @param filename Workspace-relative path to create or overwrite
   * @param content Raw text written to the target file
   * @param message Optional commit message (defaults to `Add <filename>`)
   */
  async createAndCommitFile(filename: string, content: string, message?: string): Promise<void> {
    if (!this.workspacePath || !this.git) {
      throw new Error('Workspace not created');
    }

    const filePath = path.join(this.workspacePath, filename);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
    await this.git.add(filename);
    await this.git.commit(message ?? `Repository adds ${filename}.`);
  }

  /**
   * Sets a remote URL for this workspace.
   *
   * Behavior: updates the remote if it exists, otherwise adds it.
   *
   * @param url The remote URL to set
   * @param name Optional remote name (defaults to 'origin')
   */
  async setRemote(url: string, name = 'origin'): Promise<void> {
    if (!this.git) {
      throw new Error('Workspace not created');
    }

    // Check if remote exists
    const remotes = await this.git.getRemotes();
    const exists = remotes.some((r) => r.name === name);

    if (exists) {
      await this.git.remote(['set-url', name, url]);
    } else {
      await this.git.addRemote(name, url);
    }
  }

  /**
   * Gets the first commit SHA of this repository.
   *
   * @returns Full SHA hash for the root commit in this workspace
   */
  async getFirstCommitSha(): Promise<string> {
    if (!this.git) {
      throw new Error('Workspace not created');
    }
    const output = await this.git.raw(['rev-list', '--max-parents=0', 'HEAD']);
    return output.trim();
  }

  /**
   * Destroys the test workspace, cleaning up all files.
   *
   * Behavior: clears the git queue (if any) and removes the workspace folder;
   * safe to call multiple times.
   */
  destroy(): void {
    if (this.git) {
      try {
        this.git.clearQueue();
      } catch {
        // Cleanup errors are expected
      }
      this.git = null;
    }

    if (this.workspacePath) {
      try {
        fs.removeSync(this.workspacePath);
      } catch {
        // Cleanup errors are expected
      }
      this.workspacePath = null;
    }
  }
}
