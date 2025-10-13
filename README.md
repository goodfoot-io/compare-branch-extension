# Compare Branch — AI Code Review & Git Diff

**Lightning-fast git branch comparison with intelligent auto-detection and modern tree view. Perfect for AI coding agents like Claude Code, GitHub Copilot, Cursor, and Windsurf. Streamline your PR workflow.**

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/goodfoot.compare-branch?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
[![Open VSX Registry](https://img.shields.io/open-vsx/v/goodfoot/compare-branch?label=Open%20VSX)](https://open-vsx.org/extension/goodfoot/compare-branch)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/goodfoot.compare-branch)](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/goodfoot.compare-branch)](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

---

## Why Compare Branch?

**Compare Branch** is a performance-optimized VS Code extension designed for developers who need fast, focused branch comparison without the complexity of full-featured Git suites.

In today's AI-assisted development landscape, code changes come fast. AI agents can modify dozens of files in seconds, making it crucial to have a reliable way to review changes before merging. Compare Branch is built for this reality.

**Perfect for:**

- **AI Code Review** — When Claude Code or Cursor modifies 50 files, see them all in one tree view
- **PR Reviews** — Catch mistakes before pushing (we've all been there)
- **Feature Branch Development** — See exactly what diverged from your base branch
- **Code Reviews** — Clean tree view shows what changed, organized by directory
- **Large Repositories** — Handles 10,000+ files without lag

---

## Key Features

### Choose Your Comparison Source

Switch between branches, commits, or tags to compare against your current branch.

![Choose Branch](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/branch.gif?raw=true)

### Search in Changed Files

Quickly find specific files in your changeset with the built-in search functionality.

![Search in Changed Files](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/search.gif?raw=true)

### Switch Between View Modes

Toggle between "Changed Files" mode for a focused view, or "All Files" mode to see your complete file tree with changes highlighted.

![Switch Between "Changed Files" and "All Files" modes](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/modes.gif?raw=true)

### Filter by Status

Filter files by their git status—modified, added, deleted, or renamed—to focus on specific types of changes.

![Filter by Status](https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/filter.gif?raw=true)

---

## 🤖 Built for AI Coding Workflows

Compare Branch is the **essential companion for AI coding agents** like Claude Code, GitHub Copilot, Cursor, and Windsurf.

### Why AI Agents Need Compare Branch

**Before Agent Execution:**

- 👀 **Preview your baseline** — See exactly what's in your current branch before handing off to an AI agent
- 🎯 **Verify starting state** — Ensure the agent is working from the right foundation
- 📋 **Quick context review** — Understand existing changes before requesting new work

**After Agent Execution:**

- ✅ **Instant PR preview** — See all agent-generated changes in a clean tree view
- 🔍 **Quality validation** — Review every file the agent modified before merging
- ⚡ **Fast iteration** — Spot issues immediately and provide feedback to the agent

**During Development:**

- 🔄 **Multi-agent workflows** — When running parallel agents on different branches, quickly compare outputs
- 🌳 **Branch strategy management** — Track changes across feature branches created by agents
- 📊 **Change impact analysis** — Understand the scope of agent modifications instantly

### AI Tool Integrations

Compare Branch works seamlessly with:

- **Claude Code** — Anthropic's terminal-based agentic coding tool
- **GitHub Copilot** — Industry-standard AI coding assistant (20M+ users)
- **Cursor** — AI-powered code editor with GPT integration
- **Windsurf** — Collaborative AI IDE with Cascade agent
- **Cline** (formerly Claude Dev) — Open-source VSCode AI assistant
- **Aider** — AI pair programming in your terminal
- **Continue** — Privacy-focused AI assistant for local models
- **Bolt.new** — Browser-based AI development environment

Unlike heavyweight Git extensions, Compare Branch is:

- ⚡ **Non-blocking** — Won't slow down VS Code startup or agent operations
- 🎯 **Focused** — Does one thing exceptionally well
- 🧠 **Intelligent** — Auto-detects upstream branches (works with agent-created branches)
- 📦 **Lightweight** — Minimal resource usage even with large repositories

> **Pro tip:** Keep Compare Branch open in your sidebar while agents work. When they finish, you'll instantly see all changes organized by directory—perfect for focused code review.

---

## Features

### Speed

Progressive loading means even with massive repos (tested with 10,000+ files), you get results in seconds. Git operations are cached, and the whole thing activates in the background without blocking VS Code startup. No spinning wheels.

### Auto-Detection

The extension figures out your upstream branch automatically—usually main or develop. Compares against it without any configuration. If you need to compare against something else, manual override is one click away.

### Tree View

Changes show up in a hierarchical tree organized by directory, with visual indicators for what's modified, added, deleted, or renamed. Two modes: see just what changed, or see your full file tree with changes highlighted.

### Workflow Features

Click any file for instant side-by-side diff. Drag and drop files. Multi-select for bulk operations. Right-click for context menus with all the usual file operations (open, compare, copy path, reveal in explorer, etc).

### Auto-Refresh

Watches your file system and git state. When you switch branches, make commits, or an AI agent pushes changes, the view updates automatically. No manual refresh needed.

---

## Installation

### From Visual Studio Marketplace

1. Open VS Code
2. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
3. Search for "Compare Branch"
4. Click **Install**

[Install from VS Code Marketplace →](https://marketplace.visualstudio.com/items?itemName=goodfoot.compare-branch)

### From Open VSX Registry

1. Visit [Open VSX Registry](https://open-vsx.org/)
2. Search for "Compare Branch"
3. Follow installation instructions for your platform

[Install from Open VSX →](https://open-vsx.org/extension/goodfoot/compare-branch)

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
3. **View your changes** — the extension auto-detects your upstream branch
4. **Click any file** to see a detailed diff

That's it! The extension automatically compares your current branch against its upstream (e.g., `main`, `develop`).

---

## Usage Guide

### Viewing Branch Comparisons

The extension shows all files that differ between your current branch and the source branch (typically your merge target like `main` or `develop`).

**View Modes:**

- **Changed Files Only** (default) — Shows only files with differences
- **All Files** — Shows complete file tree with changes highlighted

Toggle between modes using the filter icon in the toolbar.

### Selecting a Different Source Branch

**Automatic Detection** (recommended):

- The extension automatically detects your upstream branch from git configuration
- Updates when you switch branches or pull changes

**Manual Selection:**

1. Click the branch icon in the toolbar
2. Select a branch from the quick pick menu
3. Return to auto-detection with **Enable Auto-Detect Source Branch**

### File Operations

**Single File Operations:**

- **Click** — Open diff view
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

- `Enter` — Open diff for selected file(s)
- `Cmd+C` / `Ctrl+C` — Copy selected file path(s)
- `Delete` — Delete selected file(s) (with confirmation)

---

## Commands

Access commands via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Compare Branch: Change Source Branch** — Select a different branch to compare against
- **Compare Branch: Enable Auto-Detect Source Branch** — Return to automatic upstream detection
- **Compare Branch: Refresh** — Manually refresh the file list
- **Compare Branch: Switch to All Files Mode** — Show complete file tree
- **Compare Branch: Switch to Changed Files Mode** — Show only changed files

---

## Compare Branch vs GitLens

If you're looking for a lightweight alternative to GitLens specifically for branch comparison:

| Feature        | Compare Branch    | GitLens          |
| -------------- | ----------------- | ---------------- |
| Focus          | Branch comparison | All git features |
| Speed          | ⚡ Instant        | Slower           |
| AI Workflow    | ✅ Optimized      | ❌ Not optimized |
| Cost           | Free              | $0-19/mo         |
| Complexity     | 📦 Lightweight    | 💼 Feature-heavy |
| Startup Impact | None              | Noticeable       |

**When to use Compare Branch:** You need fast, focused branch comparison without feature bloat.

**When to use GitLens:** You need comprehensive git history, blame annotations, and team collaboration features.

Many developers use both: GitLens for history and blame, Compare Branch for reviewing changes.

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
A: That's literally why we built it. Works with Claude Code, Cursor, Copilot, Cline—all of them. The extension just watches git changes, so it doesn't matter what's making the commits. Auto-refreshes when agents push new changes, and it's fast enough that you won't notice any lag.

**Q: How is this different from using git diff in the terminal?**
A: git diff works fine for small changes. But when you're reviewing 50+ files? Good luck scrolling through all that terminal output. This gives you a clickable tree view where you can jump between files and see diffs instantly. Way faster for large changesets.

**Q: Can I use this while an agent is working?**
A: Yep. It won't slow down your editor, and it updates automatically when new commits come in. We've tested it with agents that commit dozens of times in rapid succession—still fast.

**Q: How is this different from GitLens?**
A: GitLens does everything—history, blame, collaboration features, the works. Some features need a paid subscription. Compare Branch does one thing: branch comparison, and it's completely free. Pick based on what you need. (Plenty of people use both.)

**Q: Can I compare any two branches?**
A: Yes. Use "Change Source Branch" to pick any branch, commit, or tag as your comparison base. The auto-detection usually gets it right, but manual override is there when you need it.

**Q: Does this work with large repositories?**
A: We've tested it with repos that have 10,000+ files. Progressive loading keeps it responsive even with huge changesets—the tree loads incrementally so you're never waiting around.

**Q: Can I see the diff for deleted files?**
A: Yep, click a deleted file and you'll see the diff showing what was removed.

**Q: Does this support monorepos?**
A: Works with any git repo structure—monorepos, multi-project repos, whatever you've got.

**Q: Does this work with Cursor, Windsurf, or VSCodium?**
A: Works with any VSCode-based editor: Cursor, Windsurf, VSCodium, all of them. Also available on Open VSX Registry if you prefer that over the Microsoft marketplace.

---

## Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

Found a bug? Please include:

- VS Code version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

[Report an issue →](https://github.com/goodfoot-io/compare-branch-extension/issues/new)

### Feature Requests

Have an idea? We'd love to hear it! Please describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

[Request a feature →](https://github.com/goodfoot-io/compare-branch-extension/discussions/new?category=ideas)

### Code Contributions

While Compare Branch is proprietary software, we appreciate community feedback and discussion that helps improve the extension.

---

## Roadmap

Planned features (subject to change):

- ✅ ~~Search/filter within changed files~~ (completed)
- ✅ ~~Status filtering~~ (completed)
- ✅ ~~Compare against tags~~ (completed)
- 📊 **Statistics view** — change counts, additions/deletions
- 🔀 **Commit range comparison** — compare any two commits
- 💾 **Saved comparisons** — bookmark frequently used comparisons
- 🎨 **Custom themes** — configurable file decoration colors

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
