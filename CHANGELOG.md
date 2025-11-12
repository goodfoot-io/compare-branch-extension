# Changelog

## 1.0.36
- Improved multi-repository workspace support with enhanced reliability
- Enhanced branch switching performance and cache management
- Fixed file monitoring reliability issues

## 1.0.34

- Added Pin Current Commit feature to lock comparison baseline for tracking cumulative changes
- Added Unpin Commit command to restore automatic baseline tracking
- Improved reflog-based parent branch detection for better automatic upstream detection
- Enhanced error reporting with automatic prompt after extension errors (can be disabled for 1 day)
- Added Report Issue and Request Feature commands for easier feedback submission
- Fixed tooltip cache bug where tooltips didn't update after committing and staging changes
- Improved workspace folder management for multi-root workspace support
- Enhanced telemetry logging for better performance tracking

## 1.0.32

- Improved handling of repositories with no branches to reduce unnecessary notifications

## 1.0.30

- Enhanced file tooltips with status-specific information including commit history, conflict count, and staging status
- Fixed handling of renamed and copied files in diff views to prevent path resolution errors
- Improved staging workflow with progress notifications and better error handling
- Fixed unstaged status indicator logic for files and directories

## 1.0.28

- Added unstaged file indicator (⚬) in tree view to distinguish unstaged from staged changes
- Fixed unstaged indicators not refreshing correctly in parent directories
- Added support for git worktrees in file watching
- Fixed staging status not propagating correctly to tree nodes
- Enhanced staging commands to work with individual files

## 1.0.28

- Added unstaged file indicator (⚬) to visually distinguish unstaged changes from staged changes in the tree view
- Fixed file watcher to properly support git worktrees
- Fixed stale unstaged indicators in parent directories
- Improved staging workflow with enhanced stage changes commands

## 1.0.26

- Added git worktree support for parallel development workflows
- Improved package discoverability with expanded keywords for AI coding tools
- Enhanced package description to emphasize AI code review capabilities

## 1.0.26

- Added Git worktree workflow support for comparing branches side-by-side across multiple worktrees
- Improved package description and keyword discoverability for AI-assisted development use cases
- Enhanced documentation with clearer AI code review workflow examples

## 1.0.24

- Fixed comparison issues with tags and commit hashes
- Improved documentation for side-by-side diff viewing

## 1.0.22

- Improved Git branch and tag retrieval performance for faster repository navigation
- Enhanced handling of ambiguous remote branch names for more reliable branch comparison
- Updated documentation with detailed feature descriptions and visual guides

## 1.0.20

- Fixed tree view not updating when files are modified on the same branch
- Improved incremental refresh logic to properly display file changes in real-time
- Enhanced directory status handling for better visibility of nested file changes

## 1.0.18

- Fixed untracked directories not appearing in branch comparisons

## 1.0.16

- Fixed directory deletion detection and status display in tree view
- Improved file path copying to include directories

## 1.0.14

- Added tag selection functionality for comparing against git tags

## 1.0.12

- Fixed branch selection command icon for better visual clarity
- Improved commit hash validation and error handling
- Enhanced UI text labels for better user experience
- Fixed Git decoration handling for more reliable branch comparison display

## 1.0.10

- Minor improvements and bug fixes

## 1.0.8

- Improved changelog generation and release process

## 1.0.6

- Improved file tree performance with stat-based filtering for faster loading
- Enhanced empty state handling for better user experience
- Fixed view mode button icons to use more intuitive fold/unfold indicators
- Enhanced filter menu structure with improved toggle commands and submenu organization
- Improved file watcher performance for more responsive branch comparisons
- Fixed working tree state detection for modified files
- Added Git status filters with hasFilteredDescendant support for better tree navigation

## 1.0.4

- Added git status filtering to show/hide staged, unstaged, and untracked files
- Added filter submenu for easy access to file visibility controls
- Improved view mode icons to use fold/unfold symbols for better clarity
- Enhanced file watcher performance for faster git status updates
- Filter preferences are now saved per workspace

## 1.0.2

- Minor improvements and bug fixes

## 1.0.0

- Fixed working tree state detection for modified files in branch comparisons
- Added telemetry support with privacy-compliant data sanitization for usage metrics and error tracking
- Improved performance with enhanced subscription management in decoration and loading providers
- Added comprehensive test suite covering view modes, file visibility, branch detection, and command execution
- Added JSDoc documentation throughout codebase for better maintainability
- Improved branch location checking in Git service for more reliable branch detection
- Enhanced error handling and logging across various components
- Added CI/CD workflow for automated extension releases

## 0.6.8

- Improved build process with ES module support and optimized bundling
- Updated dependencies for better performance and compatibility
- Added automated CI workflow for streamlined releases
