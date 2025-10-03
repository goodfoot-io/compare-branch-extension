# Compare Branch

Lightning-fast git branch comparison with progressive loading for Visual Studio Code.

> **Note**: This extension is **closed-source software**. This repository is for community support, issue tracking, and release distribution only. The source code is not publicly available.

## Features

- 🚀 **Lightning-fast** progressive loading of file changes
- 🌳 **Smart branch detection** with automatic upstream tracking
- 📊 **Tree view** showing all changed files between branches
- 🔍 **Quick diff viewing** with side-by-side comparison
- 🎯 **File operations** - copy, reveal, delete, rename directly from the tree
- 🔄 **Auto-refresh** on file system and git changes
- 📁 **Two view modes** - changed files only or full file tree

## Installation

### From Releases

1. Download the latest `.vsix` file from [Releases](https://github.com/goodfoot-io/compare-branch-extension/releases)
2. Verify the SHA-256 checksum (found in `checksums.txt` in the release)
3. In VS Code, go to Extensions (`Cmd+Shift+X` or `Ctrl+Shift+X`)
4. Click the `...` menu → "Install from VSIX..."
5. Select the downloaded `.vsix` file

### Verification

Always verify the integrity of downloaded releases:

```bash
# On macOS/Linux
sha256sum compare-branch-*.vsix

# On Windows (PowerShell)
Get-FileHash compare-branch-*.vsix -Algorithm SHA256
```

Compare the output with the checksum in `checksums.txt` from the release.

## Usage

1. Open a git repository in VS Code
2. Click the Compare Branch icon in the Activity Bar
3. Select a source branch to compare against your current branch
4. View all changed files in the tree view
5. Click any file to see the diff

### Commands

- **Change Source Branch** - Select a different branch to compare against
- **Enable Auto-Detect Source Branch** - Automatically detect the upstream branch
- **Refresh** - Manually refresh the file list
- **Toggle View Mode** - Switch between changed files only and full tree view

## Requirements

- Visual Studio Code 1.85.0 or higher
- Git 2.0 or higher
- A git repository

## Support

See [SUPPORT.md](SUPPORT.md) for support channels and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security disclosure policy.

## License

This software is proprietary and closed-source. All rights reserved.

See [LICENSE](LICENSE) for the full license terms.

Copyright (c) 2024 Productivity Bot

---

**Built with ❤️ by Goodfoot**
