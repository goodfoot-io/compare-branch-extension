[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/goodfoot.cards?label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=goodfoot.cards)
[![Open VSX Registry](https://img.shields.io/open-vsx/v/goodfoot/compare-branch?label=Open%20VSX)](https://open-vsx.org/extension/goodfoot/compare-branch)

Cards is a performance-optimized VS Code extension that provides comprehensive branch comparison in a hierarchical tree view. See all differences between your working branch and its base git ref without leaving your editor.

**Built for development teams working with:**

- AI coding assistants that generate multi-file changes
- Feature branch workflows requiring pre-merge review
- Large codebases with complex directory structures
- Git workflows that benefit from visual change navigation

### Flexible Branch Comparison

<img src="https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/branch.gif" alt="Compare git branches in VS Code - automatic upstream branch detection and manual branch selection for pull request preview" width="100%">

Compare against any branch, commit, or tag. Automatic upstream detection with manual override when needed.

**Solves:** Manual branch selection overhead. Zero configuration required.

### Integrated Search

<img src="https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/search.gif" alt="Search changed files in VS Code branch comparison - quickly find modified files in large AI-generated changesets" width="100%">

Quickly locate specific files within large changesets.

**Solves:** Finding files when AI agents modify 50+ files simultaneously.

### Dual View Modes

<img src="https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/modes.gif" alt="Git diff tree view modes - toggle between changed files only and complete directory tree with changes highlighted" width="100%">

Toggle between "Changed Files" for focused review or "All Files" to see changes within full directory context.

**Solves:** Need for both focused review and full repository context.

### Pin Current Commit as Baseline

<img src="https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/pin.gif" alt="Pin current commit as baseline - lock comparison point for tracking cumulative changes" width="100%">

One-click pinning of your current HEAD commit as a fixed comparison baseline. Track all subsequent changes from a known-good state, perfect for monitoring cumulative progress during iterative development or AI-assisted coding sessions.

**Solves:** Need to track cumulative changes from a specific checkpoint during development.

### Status-Based Filtering

<img src="https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/filter.gif" alt="Filter git changes by status - view only modified, added, deleted, or renamed files in branch comparison" width="100%">

Filter by modified, added, deleted, or renamed files.

**Solves:** Navigating large changesets by focusing on specific change types.

### Native Diff Integration

<img src="https://github.com/goodfoot-io/compare-branch-extension/raw/main/images/diff.gif" alt="VS Code git diff viewer integration - single-click side-by-side branch comparison for any file" width="100%">

Single-click access to VS Code's diff viewer for any file.

**Solves:** Eliminates manual `git diff <file>` commands for individual files.

---

## AI Coding Workflows

Modern AI coding assistants can modify dozens of files per operation. This creates specific challenges for code review.

### Common Pain Points

**Volume Overwhelm:** AI agents frequently modify 10-50+ files per task. Standard terminal diffs become difficult to navigate at this scale.

**Context Switching:** Moving between terminal-based AI tools and IDE for review creates friction in the development workflow.

**Validation Requirements:** Teams need to verify AI-generated code before merging, requiring file-by-file review capability.

### Supported AI Platforms

The extension integrates seamlessly with:

- **Claude Code** — Anthropic's terminal-based coding agent
- **GitHub Copilot** — Industry-standard AI pair programmer
- **Cursor** — AI-integrated code editor
- **Windsurf** — Collaborative AI development environment
- **Cline** — Open-source VS Code AI agent
- **Aider** — Terminal-based AI pair programming
- **Continue** — Privacy-focused AI assistant with local model support
- **Bolt.new** — Browser-based AI coding platform

### Workflow Integration

**Pre-execution validation:**
Review your branch baseline before delegating work to AI agents. Ensure correct starting state.

**Post-execution review:**
Examine all AI-generated changes in a unified interface. Navigate file-by-file for thorough validation.

**Real-time monitoring:**
Auto-refresh capability enables live review as AI agents create commits. Non-blocking architecture ensures no performance impact.

**Parallel development:**
For teams using git worktrees with multiple AI agents, Cards enables comparison across different working directories.

---

## Why Choose Cards?

### Comparison with Alternatives

| Capability              | Cards             | GitLens            | Git Tree Compare |
| ----------------------- | ----------------- | ------------------ | ---------------- |
| Primary focus           | Branch comparison | Complete git suite | Basic tree view  |
| Performance             | Optimized         | Feature-heavy      | Fast             |
| AI workflow support     | Purpose-built     | General-purpose    | Not optimized    |
| Auto-detect upstream    | Yes               | Partial            | No               |
| Search in changed files | Yes               | No                 | No               |
| Status filtering        | Yes               | No                 | No               |
| Progressive loading     | Yes               | Limited            | Limited          |
| Pricing                 | Free              | $0-19/mo           | Free             |
| Startup impact          | None              | Measurable         | Minimal          |

### Competitive Advantages

**Speed & Performance:** Progressive loading architecture handles repositories with 10,000+ files without performance degradation. Non-blocking activation ensures zero impact on VS Code startup time.

**Privacy:** Operates entirely locally. No cloud services, no telemetry, no external dependencies.

**Simplicity:** Single-purpose tool focused on branch comparison. No feature bloat, no complex configuration.

**Universal Compatibility:** Works with all VS Code-based editors (Cursor, Windsurf, VSCodium) and available on both VS Code Marketplace and Open VSX Registry.

**AI Workflow Optimization:** Auto-refresh for agent-generated commits. Review while agents continue working. Designed for multi-file changeset review.

---

## Installation

### From Visual Studio Marketplace

1. Open VS Code Extensions panel (`Cmd+Shift+X` or `Ctrl+Shift+X`)
2. Search for "Cards"
3. Click Install

**[→ Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=goodfoot.cards)**

### From Open VSX Registry

Available for VSCodium and privacy-focused distributions.

**[→ Install from Open VSX](https://open-vsx.org/extension/goodfoot/compare-branch)**

### From GitHub Releases

Download the `.vsix` file from [Releases](https://github.com/goodfoot-io/compare-branch-extension/releases), verify the checksum (see [Security Verification](#security-verification) below), then install via Extensions → `...` → Install from VSIX.

**Platform Compatibility:**

- Visual Studio Code
- Cursor
- Windsurf
- VSCodium
- Other VS Code forks

---

## Quick Start

1. Open a git repository in VS Code
2. Click the Cards icon in the Activity Bar
3. Review automatically detected changes
4. Click any file to view the diff

No configuration required.

---

## Usage Guide

### Branch Comparison

The extension displays all files that differ between your current branch and the selected base branch (typically main or develop).

**View modes:**

- **Changed Files** (default) — Modified files only
- **All Files** — Complete directory tree with changes highlighted

Toggle via toolbar icon.

### Base Branch Selection

**Automatic detection (recommended):**
Reads upstream branch configuration from git. Updates automatically when you switch branches or pull changes.

**Manual selection:**
Click the branch selector icon to choose any branch, commit, or tag. Return to automatic mode via "Enable Auto-Detect Base Branch" command.

### File Operations

**Single file:**

- Click to open diff view
- Right-click for context menu (open, compare, copy path, reveal in explorer, rename, delete, etc.)

**Multiple files:**

- `Cmd`/`Ctrl` + click for multi-select
- Right-click for bulk operations
- Drag and drop support (when enabled)

### Keyboard Shortcuts

- `Enter` — Open diff for selected file(s)
- `Cmd+C` / `Ctrl+C` — Copy file path(s)
- `Delete` — Delete selected file(s) with confirmation

---

## Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Cards: Change Base Branch** — Select different comparison base
- **Cards: Enable Auto-Detect Base Branch** — Return to automatic detection
- **Cards: Refresh** — Manually trigger view refresh
- **Cards: Switch to All Files Mode** — Display complete file tree
- **Cards: Switch to Changed Files Mode** — Display changed files only

---

## Security Verification

Verify downloaded releases by comparing checksums:

**macOS/Linux:**

```bash
sha256sum cards-*.vsix
```

**Windows (PowerShell):**

```powershell
Get-FileHash cards-*.vsix -Algorithm SHA256
```

Compare output with the checksum in `checksums.txt` from the release.

For security disclosures, see [SECURITY.md](SECURITY.md).

---

## Support

### Getting Help

Have questions or need assistance?

- 💬 **[Ask in GitHub Discussions](https://github.com/goodfoot-io/compare-branch-extension/discussions)** — Community support and general questions
- 🐛 **[Report bugs via Issues](https://github.com/goodfoot-io/compare-branch-extension/issues)** — Bug reports and feature requests
- 📖 **[Read the documentation](https://github.com/goodfoot-io/compare-branch-extension#readme)** — Complete usage guide

### Reporting Issues

When reporting bugs, include:

- VS Code version
- Operating system
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (if applicable)

Check existing issues before creating new reports.

See [SUPPORT.md](SUPPORT.md) for detailed guidelines.

---

## Frequently Asked Questions

**Does this work with AI coding assistants?**
Yes. The extension monitors git state and works with any tool that creates commits, including all major AI coding platforms.

**How does this differ from terminal git diff?**
Terminal diffs work well for reviewing small changes. For navigating modifications across many files and directories, a tree-based interface provides superior context and efficiency.

**Can I use this while an AI agent is working?**
Yes. Non-blocking architecture with automatic refresh as commits are created.

**How does this differ from GitLens?**
GitLens provides comprehensive git functionality. Compare Branch focuses on branch comparison. Choose based on your specific workflow requirements.

**Can I compare any two branches?**
Yes. Use the "Change Base Branch" command to select any branch, commit, or tag.

**Does it support large repositories?**
Yes. Progressive loading maintains performance with repositories containing 10,000+ files.

**Can I view diffs for deleted files?**
Yes. Clicking a deleted file displays the diff showing removed content.

**Does this work with monorepos?**
Yes. Supports any git repository structure.

**Is this compatible with VS Code forks?**
Yes. Works with Cursor, Windsurf, VSCodium, and other VS Code-based editors. Available on Open VSX Registry.

---

## Contributing

### How You Can Help

While Cards is proprietary software, community participation is valuable:

- **Report bugs** — [Open an issue](https://github.com/goodfoot-io/compare-branch-extension/issues/new)
- **Request features** — [Start a discussion](https://github.com/goodfoot-io/compare-branch-extension/discussions/new?category=ideas)
- **Share feedback** — Help us understand how you use the extension
- **Spread the word** — Star this repository and share with colleagues

### Reporting Issues

When reporting bugs, include:

- VS Code version
- Operating system
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (if relevant)

**[→ Report an issue](https://github.com/goodfoot-io/compare-branch-extension/issues/new)**

### Feature Requests

Describe:

- Problem you are solving
- Proposed solution
- Alternatives considered

**[→ Request a feature](https://github.com/goodfoot-io/compare-branch-extension/discussions/new?category=ideas)**

## Changelog

See [Releases](https://github.com/goodfoot-io/compare-branch-extension/releases) for version history and release notes.

---

## About

**Developed by:** [Goodfoot Media LLC](https://goodfoot.io)

**Technologies:** TypeScript, VS Code Extension API, simple-git, chokidar

---

## Links

- 🏪 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=goodfoot.cards)
- 🌐 [Open VSX Registry](https://open-vsx.org/extension/goodfoot/compare-branch)
- 📦 [GitHub Releases](https://github.com/goodfoot-io/compare-branch-extension/releases)
- 💬 [Discussions](https://github.com/goodfoot-io/compare-branch-extension/discussions)
- 🐛 [Issue Tracker](https://github.com/goodfoot-io/compare-branch-extension/issues)
- 🔒 [Security Policy](SECURITY.md)
- 📞 [Support Guidelines](SUPPORT.md)

---

<div align="center">

**⭐ If you find Cards useful, please star this repository!**

[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=goodfoot.cards) | [Install from Open VSX](https://open-vsx.org/extension/goodfoot/compare-branch)

</div>
