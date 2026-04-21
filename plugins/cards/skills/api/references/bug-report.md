
<how-to-write-a-bug-report>

Capture what happened with enough precision that someone else can reproduce it. Separate observation from speculation. CARD.md describes the defect and its impact — approach observations that emerge during research belong in notes (`<take-notes>` instructions from `cards:notes` skill).

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

- **Document observable facts**: Exact error messages (copy-paste), file paths, line numbers, git state, environment details. Fragment-link every named file, function, and type per `<markdown-guidelines>`.
- **Reproduction steps**: Numbered, specific, noting prerequisites and consistency (reproducible vs intermittent).
- **Separate observation from speculation**: Frame hypotheses as exploration — "This suggests..." not "The bug is caused by..."
- **Multiple observation channels**: Document which channels (logs, APIs, UIs, monitoring) you checked and what each showed.
  - Discrepancies between channels are often the most diagnostic information.
- **Observable vs non-observable state**: Name what you cannot see as well as what you can.
- **Error state vs crash**: Check actual system health independently of error reports.
- **Missing observability**: Note what visibility would have made investigation easier as concrete gaps.

</how-to-write-a-bug-report>
