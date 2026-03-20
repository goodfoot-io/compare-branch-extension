import type { CardCommit } from '@cards/sdk/protocol';

export function formatCommit(commit: CardCommit): string {
  const shortSha = commit.hash.slice(0, 7);
  const header = `${shortSha} - ${commit.author_name}: ${commit.message}`;

  const fileLines = commit.diff.files.map((f) => {
    if (f.status.startsWith('R') && f.from !== undefined) {
      return ` ${f.status} ${f.from} -> ${f.file}`;
    }
    return ` ${f.status} ${f.file}`;
  });

  return [header, ...fileLines].join('\n');
}
