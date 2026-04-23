<card-repo-commit-style>
### Card Repository Commits

Card repository commit messages summarize the content of the commit itself. An agent scanning `git log --oneline` should understand what information each commit contributes without opening the files.

**The commit message is a single sentence summarizing the commit's substance** — not a status label or inventory of files changed. If the commit adds a comment, the message summarizes the comment. If it adds a plan, the message summarizes the approach.

**Format:** One sentence. The comment content carries detail; the commit message carries a summary of that detail.

**Examples:**

| Category | Example |
|----------|---------|
| Progress | `Auth middleware validates tokens and attaches user context to requests` |
| Completion | `All four migration tasks pass type checking and integration tests` |
| Blocked | `Package X exports an incompatible type that prevents the adapter from compiling` |
| Clarification | `Title narrowed to auth middleware; added exploration notes on token flow` |
| Plan | `Three-task migration strategy starting with schema, then adapters, then callers` |
| Plan feedback | `Revised to add explicit error handling for expired tokens per feedback` |
| Accepted concerns | `Coupling tradeoff between auth and session modules accepted as pragmatic` |
| Awaiting review | `Middleware, tests, and integration wiring are complete and ready for review` |
| Question/answer | `Tokens are validated by comparing HMAC signatures against the rotated secret` |
| Reopen | `Additional error handling needed for network timeouts during token refresh` |
| Error recovery | `Merge failed due to conflicting changes in session.ts — needs manual resolution` |
| No-action | `User provided context on deployment constraints, no code changes needed` |

**Important:** Commits to the workspace should follow the distinct `<workspace-commit-style>`. 
</card-repo-commit-style>

