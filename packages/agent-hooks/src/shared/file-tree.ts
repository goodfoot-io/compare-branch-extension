/**
 * Tree-formatted rendering for file path lists.
 *
 * Builds a trie from file paths, collapses single-child directory chains,
 * and renders an indented tree that compresses shared prefixes.
 *
 * @summary Prefix-compressed file tree rendering
 */

/** Internal trie node for building the file tree. */
interface TrieNode {
  children: Map<string, TrieNode>;
  isFile: boolean;
}

function createNode(): TrieNode {
  return { children: new Map(), isFile: false };
}

/**
 * Inserts a path into the trie, splitting on `/`.
 *
 * @param root - Root trie node.
 * @param path - File path to insert.
 */
function insertPath(root: TrieNode, path: string): void {
  let node = root;
  const segments = path.split('/');
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    let child = node.children.get(seg);
    if (!child) {
      child = createNode();
      node.children.set(seg, child);
    }
    node = child;
  }
  node.isFile = true;
}

/**
 * Renders the trie as an indented tree string.
 *
 * Single-child directory chains are collapsed: `src/` → `lib/` → `utils.ts`
 * becomes `src/lib/utils.ts` when each intermediate has exactly one child.
 *
 * Directories sort before files at each level. Entries are alphabetical within
 * each group.
 *
 * @param node - Current trie node to render.
 * @param indent - Number of leading spaces for this level.
 * @returns Rendered tree lines joined by newlines.
 */
function renderNode(node: TrieNode, indent: number): string {
  const lines: string[] = [];
  const prefix = ' '.repeat(indent);

  // Separate children into directories and files
  const dirs: [string, TrieNode][] = [];
  const files: [string, TrieNode][] = [];

  for (const [name, child] of node.children) {
    if (child.isFile && child.children.size === 0) {
      files.push([name, child]);
    } else if (child.isFile && child.children.size > 0) {
      // A path segment that is both a file and has children — treat as file
      // for its own entry, then render children separately.
      files.push([name, createNode()]); // file entry
      dirs.push([name, child]); // directory entry with children
    } else {
      dirs.push([name, child]);
    }
  }

  dirs.sort(([a], [b]) => a.localeCompare(b));
  files.sort(([a], [b]) => a.localeCompare(b));

  for (const [name, child] of dirs) {
    // Collapse single-child directory chains
    let collapsed = name;
    let current = child;
    while (current.children.size === 1 && !current.isFile) {
      const [nextName, nextChild] = current.children.entries().next().value as [string, TrieNode];
      collapsed += `/${nextName}`;
      current = nextChild;
    }

    if (current.isFile && current.children.size === 0) {
      // Entire chain collapsed to a single file path
      lines.push(`${prefix}${collapsed}`);
    } else {
      // Directory node — render with trailing slash, then children
      lines.push(`${prefix}${collapsed}/`);
      lines.push(renderNode(current, indent + 2));
    }
  }

  for (const [name] of files) {
    lines.push(`${prefix}${name}`);
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Renders a list of file paths as a prefix-compressed indented tree.
 *
 * Single-child directory chains are collapsed into combined segments
 * (e.g., `src/lib/` as one node). Leaf files always appear as individual entries.
 *
 * @param paths - Flat file paths (e.g., from `git log --name-only`).
 * @returns Indented tree string, or empty string if paths is empty.
 */
export function formatFileTree(paths: string[]): string {
  if (paths.length === 0) return '';

  const root = createNode();
  for (const p of paths) {
    if (p) insertPath(root, p);
  }

  return renderNode(root, 1);
}

/**
 * Parses raw `git log --name-only` output into per-commit blocks, applies
 * tree formatting to each commit's file list, and reassembles.
 *
 * Handles two separator conventions:
 * - NUL-delimited (`%x00` in `--pretty=format`): used by `buildCardRepoLogBlock`
 * - Blank-line-delimited: used by `--no-walk` in `resolveWorkspaceCommitDetails` and the stop hook
 *
 * @param rawLog - Raw git log output with `--name-only`.
 * @param separator - How commits are separated: `'nul'` for `%x00`, `'blank-line'` for double newline.
 * @returns Formatted output with tree-rendered file lists per commit.
 */
export function formatCommitLog(rawLog: string, separator: 'nul' | 'blank-line'): string {
  if (!rawLog.trim()) return '';

  if (separator === 'nul') {
    return formatNulDelimited(rawLog);
  }
  return formatBlankLineDelimited(rawLog);
}

/**
 * NUL-delimited format: `%x00header\n\nfile1\nfile2\x00header2\n\nfile3`
 *
 * The first NUL may be at position 0 (leading), so we filter empty splits.
 *
 * @param raw - Raw NUL-delimited git log output.
 * @returns Formatted output with tree-rendered file lists.
 */
function formatNulDelimited(raw: string): string {
  const commits = raw.split('\0').filter((s) => s.trim());
  return commits.map((commit) => formatSingleCommit(commit.trim())).join('\n\n');
}

/**
 * Blank-line-delimited format: commits separated by `\n\n` where the second
 * block starts with a short hash line.
 *
 * Within a single commit, `--name-only` also puts a blank line between the
 * header and the file list. We distinguish intra-commit blank lines from
 * inter-commit blank lines by checking whether the line after the blank line
 * looks like a commit header (short hash pattern).
 *
 * @param raw - Raw blank-line-delimited git log output.
 * @returns Formatted output with tree-rendered file lists.
 */
function formatBlankLineDelimited(raw: string): string {
  const lines = raw.split('\n');
  const commitBlocks: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Detect inter-commit boundary: empty line followed by a commit header
    if (line === '' && current.length > 0) {
      const next = lines[i + 1];
      if (next && isCommitHeader(next)) {
        commitBlocks.push(current);
        current = [];
        continue;
      }
    }

    current.push(line);
  }
  if (current.length > 0) commitBlocks.push(current);

  return commitBlocks.map((block) => formatSingleCommit(block.join('\n').trim())).join('\n\n');
}

/**
 * Commit headers from `--pretty=format:%h - %s` start with a short hex hash.
 *
 * @param line - Line to test.
 * @returns Whether the line matches the commit header pattern.
 */
function isCommitHeader(line: string): boolean {
  return /^[0-9a-f]{7,} - /.test(line);
}

/**
 * Formats a single commit block: header line + file paths.
 *
 * The header is the first non-empty line. Remaining non-empty lines are file paths.
 *
 * @param block - Raw commit block text.
 * @returns Header followed by tree-formatted file list.
 */
function formatSingleCommit(block: string): string {
  const lines = block.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return '';

  const header = lines[0]!;
  const files = lines.slice(1);

  if (files.length === 0) return header;

  const tree = formatFileTree(files);
  return tree ? `${header}\n${tree}` : header;
}
