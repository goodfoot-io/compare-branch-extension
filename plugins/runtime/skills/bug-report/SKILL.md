---
name: bug-report
description: How to write a bug report card
---

<how-to-write-a-bug-report>

Good reports capture what happened with enough precision that someone else can experience the same thing, while separating observation from speculation.

## Report Structure

| Section | Content |
|---------|---------|
| Summary | One sentence describing the unexpected behavior |
| Environment | Branch, versions, relevant configuration |
| Steps to reproduce | Numbered sequence of actions |
| Expected behavior | What should have happened |
| Actual behavior | What happened instead (include error messages) |
| Investigation notes | What you explored, what you found |
| Hypothesis (optional) | Your theory about the cause, framed as speculation |

## Writing Principles

- **Document observable facts**: Exact error messages (copy-paste), file paths, line numbers, git state, environment details
- **Reproduction steps**: Numbered, specific, noting prerequisites and consistency (reproducible vs intermittent)
- **Separate observation from speculation**: Frame hypotheses as exploration — "This suggests..." not "The bug is caused by..." — premature conclusions mislead investigators
- **Multiple observation channels**: Document which channels (logs, APIs, UIs, monitoring) you checked and what each showed. Discrepancies between channels are often the most diagnostic information.
- **Observable vs non-observable state**: Naming what you cannot see is as valuable as documenting what you can
- **Error state vs crash**: Check actual system health independently of error reports — a system can report errors while producing no useful work, or fail silently
- **Missing observability**: Note what visibility would have made investigation easier as concrete gaps

</how-to-write-a-bug-report>
