# Card Validation Reference

## CARD.meta.json Field Constraints

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `id` | string | Yes | Non-empty, max 16 chars. Format: `{branch-prefix}-{counter}` |
| `title` | string | Yes | Non-empty, max 200 chars |
| `status` | enum | Yes | One of: `todo`, `in_progress`, `needs_review`, `done`, `backlog`, `archived` |
| `tags` | string[] | Yes | Each tag: max 50 chars, pattern `/^[a-z0-9-]+$/` |
| `gates` | object | Yes | Four boolean fields (see Gate Logic below) |
| `isPinned` | boolean | Yes | Pin to top of lists |
| `order` | number | Yes | Display order within status column |
| `repositoryId` | string | No | If present, must be non-empty |

## Status Values

```
todo          Initial state
in_progress   Work in progress
needs_review  Ready for review
done          Completed
backlog       Deferred
archived      Auto-set from "done" after 7 days of inactivity
```

## Tag Rules

- Lowercase letters, numbers, and hyphens only: `/^[a-z0-9-]+$/`
- Maximum 50 characters per tag
- Examples: `bug-fix`, `feature`, `frontend-ui`, `p0`

## Gate Logic

All four gate fields are required booleans:

```json
{
  "planRequired": false,
  "planApproved": false,
  "reviewRequired": false,
  "reviewApproved": false
}
```

Cross-field constraints enforced by the validator:
- `planApproved: true` requires `planRequired: true`
- `reviewApproved: true` requires `reviewRequired: true`

Setting an approval flag without its corresponding requirement flag is a validation error.

## Attachment ID Pattern

```
Full pattern: att-[a-f0-9-]{36}_[\w.-]+
UUID portion: standard UUID4 (36 chars with hyphens)
Filename:     word characters, dots, hyphens (no spaces)
```

Attachment references in CARD.md are scanned in both `![...](att-...)` and
`[...](att-...)` syntax, with or without the `attachment/` prefix.

## Comment Filename Pattern

```
UUIDv7: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/
File:   {uuidv7}.md
```

The version nibble (position 13) must be `7`. Comments with non-UUIDv7 filenames
are rejected by the pre-commit hook.

## Validation Error Codes

| Code | Meaning |
|------|---------|
| `missing_field` | Required field absent |
| `invalid_type` | Wrong data type |
| `invalid_format` | Malformed value |
| `length_exceeded` | Exceeds max length |
| `pattern_mismatch` | Does not match required pattern |
| `invalid_status` | Not a valid status enum value |
| `invalid_gate` | Gate field is not boolean |
| `invalid_gate_logic` | Approval set without requirement |
| `malformed_json` | JSON parse failure |
| `metadata_missing` | CARD.meta.json not found |
| `file_not_found` | Required file missing |
| `attachment_not_found` | Referenced attachment missing from attachment/ |
| `invalid_attachment_id` | Attachment ID fails format check |
