---
name: markdown
description: Markdown guidelines for card content.
---
<!-- @cards.management/agent-skills source: public/skills-src/shared/markdown/SKILL.md.eta sha256:ec9b8d53ddfbca6bcb54e848d485f87447041bfd08d00f15190c3ef85f147879 -->

<markdown-guidelines>

**Link code references instead of naming them.** When prose names a file, symbol, type, or config that exists in the codebase, make it a fragment link to its definition rather than a backtick span: `[validateSession()](./src/auth/session.ts#L15)`, not `validateSession`. Add a line or range — `#L42`, `#L42-L58` — when the exact location matters. Paths resolve from the project root, not from the file the markdown lives in; leave non-code paths and external URLs as plain text.

**Diagram structure; narrate everything else.** Reach for a fenced `mermaid` block only when relationships are the point — multi-component flows, state transitions, decision trees. Prefer prose when the reasoning, not the shape, carries the meaning.

**Fold away digressions.** Wrap long supporting detail — error dumps, logs, optional context — in `<details><summary>…</summary>`, leaving a blank line after the summary so the body renders.

</markdown-guidelines>
