# Custom Types Reference

## Type Configuration

Types are defined in `.cards/settings.json` under an environment's `types` key:

```json
{
  "environments": {
    "default": {
      "version": 1,
      "types": {
        "contract": {
          "version": "1.0.0",
          "schema": "JSON object conforming to the contract specification",
          "description": "Legal contract definitions with validation",
          "validator": {
            "command": "node ./validators/contract.mjs",
            "timeout": 30000
          }
        }
      }
    }
  }
}
```

## Type Name Rules

- Pattern: `/^[a-z][a-z0-9-]*$/` (must start with lowercase letter)
- Reserved names that cannot be used as type names:
  `attachment`, `comment`, `cards`, `api`, `internal`, `health`, `ws`, `schema`

## Validator Protocol

Validators are spawned as child processes (no shell). They receive context via
environment variables:

| Variable | Description |
|----------|-------------|
| `FILE_PATH` | Absolute path to the file |
| `TYPE_NAME` | Type name |
| `TYPE_VERSION` | Type version from settings |
| `FILE_NAME` | Filename within the type directory |
| `CARD_ID` | Card ID that owns the file |
| `CONTENT_TYPE` | MIME content type |

The validator must write a JSON result to stdout:

### Success

```json
{
  "valid": true,
  "metadata": { "key": "optional custom metadata" }
}
```

### Failure

```json
{
  "valid": false,
  "errors": ["Markdown-formatted error message"]
}
```

Timeout defaults to 30,000ms (range: 1,000-300,000ms). On timeout: SIGTERM,
then SIGKILL after grace period.

## Typed File Metadata Sidecar

Each validated typed file gets a `.meta.json` sidecar created by the pre-commit hook:

```json
{
  "contentType": "application/json",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "type": "contract",
  "typeVersion": "1.0.0",
  "metadata": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `contentType` | string | MIME type detected from file extension |
| `sha256` | string | SHA-256 hash of file content |
| `type` | string | Type name from settings |
| `typeVersion` | string | Type version at validation time |
| `metadata` | object? | Optional metadata produced by the validator |

The sidecar is automatically staged by the pre-commit hook after successful validation.
