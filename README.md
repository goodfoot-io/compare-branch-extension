# Compare Branch - Git Diff & PR Preview

**Lightning-fast git branch comparison with intelligent auto-detection and modern tree view. Perfect for AI coding agents like Claude Code, GitHub Copilot, and Cursor. Streamline your PR workflow.**

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/goodfoot.compare-branch?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
[![Open VSX Registry](https://img.shields.io/open-vsx/v/goodfoot/compare-branch?label=Open%20VSX)](https://open-vsx.org/extension/goodfoot/compare-branch)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/goodfoot.compare-branch)](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/goodfoot.compare-branch)](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

---

## Why Compare Branch?

**Compare Branch** is a performance-optimized VS Code extension designed for developers who need fast, focused branch comparison without the complexity of full-featured Git suites.

Perfect for:

- 👨‍💻 **PR Reviews** - Preview your pull request changes before pushing
- 🌿 **Feature Branch Development** - Track all changes from your base branch
- 🔍 **Code Reviews** - See exactly what changed in a clean tree view
- ⚡ **Large Repositories** - Progressive loading keeps things fast

---

## Key Features at a Glance

### Choose Your Comparison Source

Switch between branches, commits, or tags to compare against your current branch.

![Choose Branch](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/branch.gif?raw=true)

### Search in Changed Files

Quickly find specific files in your changeset with the built-in search functionality.

![Search in Changed Files](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/search.gif?raw=true)

### Switch Between View Modes

Toggle between "Changed Files Only" mode for a focused view, or "All Files" mode to see your complete file tree with changes highlighted.

![Switch Between "Changed Files" and "All Files" modes](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/modes.gif?raw=true)

### Filter by Status

Filter files by their git status—modified, added, deleted, or renamed—to focus on specific types of changes.

![Filter by Status](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/status.gif?raw=true)

---

## 🤖 Built for AI Coding Workflows

Compare Branch is the **essential companion for AI coding agents** like Claude Code, GitHub Copilot, Cursor, and Windsurf.

### Why AI Agents Need Compare Branch

**Before Agent Execution:**

- 👀 **Preview your baseline** - See exactly what's in your current branch before handing off to an AI agent
- 🎯 **Verify starting state** - Ensure the agent is working from the right foundation
- 📋 **Quick context review** - Understand existing changes before requesting new work

**After Agent Execution:**

- ✅ **Instant PR preview** - See all agent-generated changes in a clean tree view
- 🔍 **Quality validation** - Review every file the agent modified before merging
- ⚡ **Fast iteration** - Spot issues immediately and provide feedback to the agent

**During Development:**

- 🔄 **Multi-agent workflows** - When running parallel agents on different branches, quickly compare outputs
- 🌳 **Branch strategy management** - Track changes across feature branches created by agents
- 📊 **Change impact analysis** - Understand the scope of agent modifications instantly

### AI Agent Integrations

Compare Branch works seamlessly with:

- **Claude Code** - Terminal-based agentic coding
- **GitHub Copilot** - Coding agent for pull requests
- **Cursor** - AI-powered code editor
- **Windsurf** - Collaborative AI coding
- **Cline** (formerly Claude Dev) - VSCode AI assistant
- **Aider** - AI pair programming in your terminal

Unlike heavyweight Git extensions, Compare Branch is:

- ⚡ **Non-blocking** - Won't slow down VS Code startup or agent operations
- 🎯 **Focused** - Does one thing exceptionally well
- 🧠 **Intelligent** - Auto-detects upstream branches (works with agent-created branches)
- 📦 **Lightweight** - Minimal resource usage even with large repositories

> **Pro tip:** Keep Compare Branch open in your sidebar while agents work. When they finish, you'll instantly see all changes organized by directory—perfect for focused code review.

---

## Features

### ⚡ Lightning-Fast Performance

- **Progressive loading** for instant insights, even in large repositories
- **Optimized git operations** with smart caching
- **Non-blocking activation** - doesn't slow down VS Code startup

### 🧠 Intelligent Auto-Detection

- **Automatic upstream branch detection** - no manual configuration needed
- **Smart branch tracking** - automatically compares against your merge target
- **Manual override** available when you need it

### 🌳 Modern Tree View

- **Hierarchical file display** - see changes organized by directory
- **Git status decorations** - visual indicators for added, modified, deleted files
- **Two view modes**:
  - Changed files only (default)
  - Full file tree with change highlights

### 🎯 Streamlined Workflow

- **Quick diff viewing** - one click to see side-by-side comparisons
- **Drag-and-drop file operations** - modern, intuitive interface
- **Multi-select support** - work with multiple files at once
- **Context menu integration** - all the actions you need, when you need them

### 🔄 Auto-Refresh

- **File system monitoring** - detects changes as you work
- **Git change tracking** - updates when you switch branches or commit
- **Debounced updates** - efficient, non-intrusive refreshing

---

## Installation

### From Visual Studio Marketplace

1. Open VS Code
2. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
3. Search for "Compare Branch"
4. Click **Install**

### From Open VSX Registry

1. Visit [Open VSX Registry](https://open-vsx.org/)
2. Search for "Compare Branch"
3. Follow installation instructions for your platform

### From GitHub Releases

1. Download the latest `.vsix` file from [Releases](https://github.com/goodfoot-io/compare-branch-extension/releases)
2. Verify the SHA-256 checksum (see [Security Verification](#security-verification))
3. In VS Code, go to Extensions (`Cmd+Shift+X` or `Ctrl+Shift+X`)
4. Click the `...` menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file

---

## Quick Start

1. **Open a git repository** in VS Code
2. **Click the Compare Branch icon** in the Activity Bar (left sidebar)
3. **View your changes** - the extension auto-detects your upstream branch
4. **Click any file** to see a detailed diff

That's it! The extension automatically compares your current branch against its upstream (e.g., `main`, `develop`).

---

## Usage Guide

### Viewing Branch Comparisons

The extension shows all files that differ between your current branch and the source branch (typically your merge target like `main` or `develop`).

**View Modes:**

- **Changed Files Only** (default) - Shows only files with differences
- **All Files** - Shows complete file tree with changes highlighted

Toggle between modes using the filter icon in the toolbar.

### Selecting a Different Source Branch

**Automatic Detection** (recommended):

- The extension automatically detects your upstream branch from git configuration
- Updates when you switch branches or pull changes

**Manual Selection**:

1. Click the branch icon in the toolbar
2. Select a branch from the quick pick menu
3. Return to auto-detection with **Enable Auto-Detect Source Branch**

### File Operations

**Single File Operations:**

- **Click** - Open diff view
- **Right-click** for context menu:
  - Open / Open to Side / Open With
  - Compare with Selected
  - Copy Path / Copy Relative Path
  - Reveal in Explorer / File Explorer
  - Rename / Delete
  - Discard Changes
  - Open in Terminal

**Multi-Select Operations:**

- Hold `Cmd` (Mac) or `Ctrl` (Windows/Linux) and click multiple files
- Right-click for bulk operations
- Drag-and-drop to move files (when enabled in settings)

### Keyboard Shortcuts

- `Enter` - Open diff for selected file(s)
- `Cmd+C` / `Ctrl+C` - Copy selected file path(s)
- `Delete` - Delete selected file(s) (with confirmation)

---

## Commands

Access commands via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Compare Branch: Change Source Branch** - Select a different branch to compare against
- **Compare Branch: Enable Auto-Detect Source Branch** - Return to automatic upstream detection
- **Compare Branch: Refresh** - Manually refresh the file list
- **Compare Branch: Switch to All Files Mode** - Show complete file tree
- **Compare Branch: Switch to Changed Files Mode** - Show only changed files

---

## Security Verification

Always verify the integrity of downloaded releases:

### macOS/Linux

```bash
sha256sum compare-branch-*.vsix
```

### Windows (PowerShell)

```powershell
Get-FileHash compare-branch-*.vsix -Algorithm SHA256
```

Compare the output with the checksum in `checksums.txt` from the release.

For security disclosures, see [SECURITY.md](SECURITY.md).

---

## Support

### Getting Help

- 💬 Ask questions in [GitHub Discussions](https://github.com/goodfoot-io/compare-branch-extension/discussions)
- 🐛 Report bugs via [GitHub Issues](https://github.com/goodfoot-io/compare-branch-extension/issues)

### Before Reporting Issues

1. Check [existing issues](https://github.com/goodfoot-io/compare-branch-extension/issues)
2. Update to the latest version
3. Try disabling other Git extensions
4. Include your VS Code version and OS

See [SUPPORT.md](SUPPORT.md) for detailed support guidelines.

---

## Frequently Asked Questions

**Q: Does this work with AI coding agents like Claude Code or Cursor?**
A: Absolutely! Compare Branch is specifically optimized for AI coding workflows. It's lightweight (won't slow down your IDE or agent), provides instant PR previews when agents finish work, and auto-detects branches created by agents. Many developers use it as their primary tool for reviewing AI-generated code.

**Q: How is this different from using git diff in the terminal?**
A: While AI coding agents work great in terminals, Compare Branch provides a visual tree view that makes it much faster to review large changesets. Instead of scrolling through terminal output, you get an organized, clickable file tree with instant diffs—perfect for validating agent work before merge.

**Q: Can I use this while an agent is working?**
A: Yes! Compare Branch is non-blocking and uses progressive loading. You can browse changes while agents run in the background. The view auto-refreshes when agents commit new changes.

**Q: How is this different from GitLens?**
A: Compare Branch is focused specifically on branch comparison with optimized performance. GitLens is a comprehensive Git toolset with many features, some requiring a paid subscription. If you only need branch comparison, Compare Branch is faster and simpler. Think of it this way: if GitLens is a Swiss Army knife, Compare Branch is a laser-focused scalpel.

**Q: Can I compare any two branches?**
A: Yes! Use "Change Source Branch" to select any branch as your comparison base.

**Q: Does this work with large repositories?**
A: Yes! Progressive loading ensures the extension remains fast even with thousands of changed files—especially important when reviewing large AI-generated changesets.

**Q: Can I see the diff for deleted files?**
A: Yes, clicking a deleted file shows a diff between the base version and empty state.

**Q: Does this support monorepos?**
A: Yes, the extension works with any git repository structure.

---

## Roadmap

Planned features (subject to change):

- 🔍 **Search/filter** within changed files
- 📊 **Statistics view** - change counts, additions/deletions
- 🏷️ **Tag comparison** - compare against tags, not just branches
- 🔀 **Commit range comparison** - compare any two commits
- 💾 **Saved comparisons** - bookmark frequently used comparisons
- 🎨 **Custom themes** - configurable file decoration colors

Vote for features or suggest new ones in [GitHub Discussions](https://github.com/goodfoot-io/compare-branch-extension/discussions).

---

## License

This software is proprietary and closed-source. All rights reserved.

**Copyright © 2025 Goodfoot Media LLC**

See [LICENSE](LICENSE) for full license terms.

### Terms Summary

- ✅ Personal and commercial use permitted
- ✅ Use in unlimited projects
- ❌ No source code access
- ❌ No redistribution
- ❌ No reverse engineering

---

## Changelog

See [Releases](https://github.com/goodfoot-io/compare-branch-extension/releases) for version history and release notes.

---

## Credits

**Built with ❤️ by [Goodfoot Media LLC](https://goodfoot.io)**

### Technologies

- TypeScript
- VS Code Extension API
- simple-git
- chokidar

---

## Links

- 🏪 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
- 🌐 [Open VSX Registry](https://open-vsx.org/extension/goodfoot/compare-branch)
- 📦 [GitHub Releases](https://github.com/goodfoot-io/compare-branch-extension/releases)
- 💬 [Discussions](https://github.com/goodfoot-io/compare-branch-extension/discussions)
- 🐛 [Issue Tracker](https://github.com/goodfoot-io/compare-branch-extension/issues)
- 🔒 [Security Policy](SECURITY.md)
- 📞 [Support](SUPPORT.md)

---

## SEO Keywords

AI coding agent, Claude Code, GitHub Copilot, Cursor IDE, Windsurf, git branch compare, branch comparison vscode, git diff branches, compare git branches, vscode git comparison, branch diff tool, git tree compare, pull request preview, git branch viewer, branch changes vscode, git file diff, compare branches visually, git branch tree, source control comparison, git scm vscode, branch comparison tool, git tree view, compare working tree, fast branch diff, lightweight git compare, pr review tool, AI agent code review, agentic coding, VSCodium, Cline AI assistant, Aider pair programming
