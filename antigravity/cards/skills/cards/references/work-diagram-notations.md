# Work Diagrams — Notation Catalog

Pick the notation by the question the reader will ask of the diagram, not by what is easiest to draw. Semantics: `work-diagram-concepts.md`. Visual language: `work-diagram-style.md`.

| Reader's question | Notation | First principles to preserve |
|---|---|---|
| What blocks what? What can run in parallel? | **Dependency DAG** (CI-pipeline style: jobs as status cards, edges as needs) | Fans show concurrency, convergences show gating; state on the node keeps topology legible at any zoom; the longest-running active node explains the wait. |
| When does work happen, and how do spans overlap? | **Gantt** (rows × shared time axis) | The time grid is ground truth; a bar's *edges* carry the dates; group headers express breakdown without changing the time math; an arrowhead past the frame means "continues — future undecided". |
| Which path determines the finish? Where is slack? | **PERT / critical-path network** | Nodes carry earliest/latest times; the critical path is the single visually dominant route; slack is shown, not implied. |
| What is the flow, and where does it branch or merge? | **Activity / BPMN flow** | Distinct glyphs for task, decision, fork/join bars, start/end; a join's mode (all/any) is a drawn device, never inferred from arrow convergence. |
| Who does what, and where are the handoffs? | **Swimlanes / service blueprint** | One lane per participant or layer; crossings *are* the handoffs; the line of visibility separates what the requester sees from backstage work. |
| How did understanding evolve during the incident/work? | **Annotated narrative timeline** | Events as dots, active periods as spans, lanes per activity kind; annotation cards pinned to timestamps with leader lines keep reasoning attached to evidence; the gap between first signal and true cause is the visible cost. |
| What produced what? Can I trust this output? | **Provenance / workflow graph** | Artifacts and tasks alternate along directed edges; state marks each node; the path from source through decisions to final output is traceable without reading labels. |

## Choosing

- A mermaid diagram in CARD.md is the default for a plain dependency or flow graph. Author an SVG page only when the diagram needs lanes, a time axis, state marks, or provenance that mermaid cannot carry.
- One diagram, one question. If the card needs two answers, author two pages rather than one hybrid — each page's `.html`/`.meta.json` pair in its own commit. Named exception: plan-vs-actual on a shared axis is one question, with planned and actual visibly separately encoded (e.g. planned span vs. actual span per row).
- Gantt and PERT require real dates and durations from the record; without them, pick a DAG. Never estimate a time to fill a notation's slots.
- Plan favors DAG/gantt/flow; execution history favors timeline/provenance.
