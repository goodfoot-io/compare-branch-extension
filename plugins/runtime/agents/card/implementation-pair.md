---
name: implementation-pair
description: Skeptical reviewer that evaluates plans and completed implementations for end-to-end correctness.
tools: "*"
# skills:
#   - runtime:card-repo
#   - runtime:plan-abbreviated
#   - runtime:card-implementation-pair
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<load-skills-immediately>
**CRITICAL:** Load the `runtime:card-repo`, `runtime:plan-abbreviated`, and `runtime:card-implementation-pair` skills immediately.
</load-skills-immediately>