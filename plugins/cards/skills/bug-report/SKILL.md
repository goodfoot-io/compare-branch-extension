---
name: bug-report
description: How to write a bug report issue
---

<how-to-write-a-bug-report>

Good reports capture what happened with enough precision that someone else can experience the same thing, while separating observation from speculation.

## Writing Process

### Document Observable Facts

Start with what you can verify:

- Exact error messages (copy-paste, don't paraphrase)
- File paths and line numbers where behavior occurred
- Git state (branch, commit SHA, dirty files)
- Environment details (versions, configuration)
- Timestamps if relevant to the behavior

### Provide Reproduction Steps

Include the sequence of actions:

- Number steps in order
- Be specific about inputs and interactions
- Note any prerequisites or setup required
- Indicate whether you can reproduce consistently
- If intermittent, say so explicitly

### Separate Observation from Speculation

Share investigation without overstating conclusions:

| Pattern | Example |
|---------|---------|
| Observation | "I noticed X happens when Y" |
| Hypothesis | "This suggests the issue might involve Z" |
| Investigation | "I checked A and found B" |
| Avoid | "The bug is caused by..." (unless verified) |

Speculation about root causes provides investigative leads, but premature conclusions can mislead. Frame hypotheses as exploration to invite consideration while remaining open to alternatives.

### Write for the Investigator

Include context you might take for granted:
- What you were trying to accomplish
- What the system should have done
- What it did instead

Avoid:
- Vague descriptions ("it doesn't work")
- Assertions about root cause without evidence
- Multiple unrelated issues in one report
- Emotional framing or urgency statements

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

## Advanced Investigation Techniques

### Multiple Observation Channels

The same system exposes state through different interfaces—logs, APIs, user interfaces, monitoring tools, debug consoles. Each channel shows a partial view. Bugs often reveal themselves through discrepancies: one channel shows success while another shows failure, or timestamps don't align across sources.

Document which channels you checked and what each showed. When channels disagree, that disagreement is often the most diagnostic information in your report.

### Observable vs Non-Observable State

Some state is hidden from you. Acknowledge this explicitly. When you write "I could not observe X," you communicate the boundaries of your investigation and help identify missing instrumentation.

Hidden state includes anything internal to a system you cannot inspect: memory contents without a debugger attached, internal queues without metrics exposed, state that changes faster than you can capture it, or third-party systems you have no visibility into. Naming what you cannot see is as valuable as documenting what you can.

### Distinguish Error State vs Crash

A reported error and a stopped system are different failure modes with different implications. A system can report an error and continue running in an undefined state—appearing healthy to monitoring while producing no useful work. Conversely, a system can fail silently with no error reported.

Check actual system health independently of error reports. Ask: is the system still running? Is it responsive? Is it producing correct output? A logged error with continued operation often indicates a more subtle problem than a clean crash.

### Identify Missing Observability

Note what visibility would have made your investigation easier. This serves two purposes: it helps the next investigator know what to set up before reproducing, and it creates a feedback loop for improving the system's debugging infrastructure.

Frame these as concrete gaps: "Knowing the internal queue length would clarify whether this is backpressure" or "A trace of the decision logic would show why this path was taken." Missing observability is a finding worth documenting.

### Timeline with Event Types

Construct timelines that categorize events by type: user actions, system events, errors, state changes, and your own observations. This structure reveals gaps—what happened between the user action and the error?—and patterns—do failures always follow a specific event type?

Separating observation timestamps from event timestamps matters. You may discover an error in logs at 3:00pm that actually occurred at 2:45pm. Mixing these obscures the actual sequence.

## Why This Matters

Reproducibility bridges "something went wrong" and "we understand why." Observable facts form shared ground truth—without them, investigators must guess. Root cause analysis requires reproduction and verification; until confirmed, even plausible explanations remain hypotheses. Investing effort in clarity upfront reduces back-and-forth and increases the likelihood issues get resolved.
</how-to-write-a-bug-report>