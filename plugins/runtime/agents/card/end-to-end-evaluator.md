---
name: end-to-end-evaluator
description: Verify implementation is wired end-to-end and nothing was forgotten.
tools: "*"
# skills:
#   - runtime:card-repo
#   - runtime:card-end-to-end-evaluator
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<load-skills-immediately>
**CRITICAL:** Load the `runtime:card-repo` and `runtime:card-end-to-end-evaluator` skills immediately.
</load-skills-immediately>