
<how-to-write-an-investigation-request>

An investigation request should make the intent and outcomes explicit: what needs to be learned, why it matters, and how to know when the investigation is complete. It should avoid prescribing solutions and instead focus on evidence gathering and decision readiness.

## Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Summary | Concise statement of the unknown and why it matters | "What are we trying to learn and why now?" |
| Background | Context that frames the investigation | "What is the current situation?" |
| Key Questions / Hypotheses | The unknowns to resolve | "What do we need to validate or falsify?" |
| Scope & Constraints | Boundaries for the investigation | "What is in/out, and what limits apply?" |
| Approach & Evidence Sources | How evidence will be gathered | "Where will answers come from?" |
| Deliverables | Expected outputs | "What artifacts should exist when done?" |
| Decision Criteria | How results influence next steps | "How will we decide what to do next?" |
| Risks & Assumptions | Known uncertainties and dependencies | "What could invalidate or skew results?" |

## Section Notes

- **Summary** (omit header in output): Write as a question or uncertainty paired with impact. Focus on the learning objective and the decision it will inform.
- **Background** (omit header in output): Only context required to understand why the investigation is needed now. Concise and factual. Use markdown fragment links for workspace files — `[src/auth/provider.ts L42](./src/auth/provider.ts#L42)` — instead of backtick code spans so references are clickable in the card-detail webview. Non-workspace paths remain as backtick code spans.
- **Key Questions / Hypotheses**: Phrase questions so they can be answered with data. Replace vague "Is this scalable?" with "What throughput is sustainable under current resource constraints?"
- **Scope & Constraints**: Narrow enough to complete, broad enough to answer the key questions.
- **Approach & Evidence Sources**: Favor evidence that is repeatable and verifiable.
- **Deliverables**: Summary of findings, recommendations with trade-offs, prototype results, decision logs. Use diagrams for relationships or flows discovered during investigation.
- **Decision Criteria**: Thresholds for proceeding, how uncertainty will be handled, who signs off.
- **Risks & Assumptions**: Data quality limitations, external dependencies, risks of false positives/negatives.

</how-to-write-an-investigation-request>
