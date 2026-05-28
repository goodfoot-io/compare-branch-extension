<how-to-write-an-operations-request>

Capture the operational goal, evidence, and verification while minimizing risk. Emphasize outcomes, constraints, and safety over implementation details. CARD.md describes the operational situation and urgency — approach observations that emerge during research belong in notes (`<take-notes>` instructions from `$notes` skill).

## Request Structure

| Section | Content |
|---------|---------|
| Title | One sentence naming the system, operational goal, and impact |
| Commander's Intent (no header in CARD.md) | Opening paragraph(s) — target system state after the change |
| Context | What is failing or degrading today, with evidence |
| Desired Outcome | Measurable target state and how to verify it |
| Impact/Risk | User impact, urgency, and risk level |
| Change Type | Standard/normal/emergency and why |
| Scope | In-scope systems/environments and explicit exclusions |
| Constraints/Dependencies | Change windows, approvals, and cross-team dependencies |
| References | Dashboards, incidents, runbooks, tickets, or configs |
| Rollback/Contingency (Optional) | Expectations for reversibility or mitigation |

## Writing Principles

- **Open with Commander's Intent** (no heading in CARD.md — the card opens with this paragraph after the title). The destination is observed system behavior after the change, not "run the script"; acceptance is a dashboard, metric, or query a reviewer can check. Every downstream section serves the intent; anything that does not moves to `notes/` or the intent is wrong.
- **Objective and urgency**: What needs to be true after the work, what impact is at risk (SLA/SLO, error budget), how urgent and why.
- **Evidence-grounded**: Symptoms, metrics, logs, dashboards, incident links; baselines (build time, failure rate, latency, cost). Fragment-link every named file, function, and type per `<markdown-guidelines>`.
- **Measurable outcomes**: Success targets, verification steps (dashboard checks, canary signals), must-have vs nice-to-have.
- **Change classification**: Standard/normal/emergency (ITSM/ITIL), environments affected, change windows, approvals.
- **Risk and reversibility**: Blast radius, failure modes, rollback/backout expectations, preconditions (access, feature flags, backups).
- **Ownership**: Primary owner/on-call, escalation path, stakeholder update expectations.

## Domain-Specific Guidance

**CI/Build/Tooling:**
- Name the pipeline/job and failure modes
- Include baseline run time, flake rate, or failure frequency
- Note build artifacts, caches, or external dependencies

**Infra/Platform Chores:**
- Specify environment, lifecycle stage, and deadline drivers (EOL, security)
- Note capacity, cost, and performance signals
- Call out sequencing with other migrations or change windows

**Support/Runbook Work:**
- Include trigger conditions, symptoms, and decision points (mermaid flowcharts for multi-branch decision trees)
- Define verification signals and escalation paths
- Keep steps outcome-focused; avoid prescribing exact commands unless required

</how-to-write-an-operations-request>
