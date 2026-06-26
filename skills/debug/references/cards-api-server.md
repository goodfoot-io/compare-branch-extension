# Cards API Server Reference

Scope: the Cards API server's discovery file schema, database settings, liveness states, and recovery constants. Excludes diagnostic procedures — those live in `diagnose-server-health.md`.

Source of truth: this file owns the discovery file schema (`cards-api.json`), database PRAGMA settings (`openDatabase()`), liveness state definitions, and recovery polling constants. All other files link here rather than restating these facts.

Completeness: every server configuration constant, database pragma, and discovery file field in the Cards extension as of version 1.0.x. Does not cover EDH-specific variants (see `platform-reference.md`).

## Discovery File

**Path**: `~/.cards/cards-api.json` (production) or `~/.cards/edh/{edhId}/storage/cards-api.json` (EDH).

**Overridden by**: `$CARDS_DISCOVERY_PATH`.

**Resolution**: `discoverApiInfo()` → `$CARDS_DISCOVERY_PATH` → `{resolveGlobalCardsConfigDir()}/cards-api.json`.

**Written by**: `startCardsApi()` in `packages/extension/src/lifecycle/cardsApiLifecycle.ts`. Atomic write: temp file at `{path}.{6rand}.tmp` with `'wx'` + `0o600`, then `fs.rename`.

### Schema

```json
{
  "port": 52431,
  "host": "127.0.0.1",
  "pid": 12345,
  "accessToken": "<bearer-token>",
  "startedAt": "2026-06-26T14:45:00.000Z",
  "buildTime": 1719432000000,
  "reposPath": "/home/user/.cards/cards-repos"
}
```

| Field | Type | Required | Status | Description |
|-------|------|----------|--------|-------------|
| `port` | number | Yes | current | Server listen port |
| `host` | string | Yes | current | Server host (always `127.0.0.1`) |
| `pid` | number | Yes | current | Server owner process ID |
| `accessToken` | string | Yes | current | Bearer token for API authentication |
| `startedAt` | string | Yes | current | ISO 8601 startup timestamp |
| `buildTime` | number | No | current | Extension build timestamp (epoch ms from `__BUILD_TIME__` esbuild define) |
| `reposPath` | string | No | current | Path to card repositories directory |

`buildTime` is used for stale-server takeover: a newer build kills the old server and takes ownership.

### Lifecycle Watcher

**Source**: `packages/extension/src/lifecycle/cardsApiLifecycle.ts`::`watchDiscoveryFile()`.

A watcher (`fs.watch` on parent dir + 5s polling fallback) detects peer writes and self-demotes when a newer `buildTime` appears (or equal `buildTime` with different `port`/`accessToken` — same-build peer took over during a health stall).

A dead-PID discovery file is atomically claimed: renamed to `{path}.{6rand}.stale`, content compared, deleted only if matching — preventing cascading eviction when a peer writes a fresh file between read and unlink.

**Re-assert**: When the discovery file is externally deleted (ENOENT), the watcher re-asserts it after a debounce window with a peer-existence check — it won't clobber a fresh file written by a peer during the debounce.

## Liveness States

| State | File | PID | TCP pre-probe | Health check | Meaning |
|-------|------|-----|---------------|--------------|---------|
| Healthy owner | present | alive | reachable | — | Server running — connect as client |
| Slow but healthy | present | alive | timeout | passes within 200ms | Server running under CPU load — connect as client |
| Stale PID | present | alive | dead | — | Port definitively refused/reset/closed. Stale — treated as not_found |
| Crashed owner | present | dead | — | — | Discovery file cleaned up. Trigger recovery poll |
| Hung port | present | alive | timeout | fails within 200ms | Port hung — treated as stale |
| No server | absent | — | — | — | Server never started or crashed |

**Source**: `packages/extension/src/lifecycle/cardsApiLifecycle.ts`::`checkExistingServer()`, `checkPortTcp()`, `checkPortHealth()`.

## Database Settings

**Path**: `~/.cards/cards.db` (production) or `~/.cards/edh/{edhId}/storage/cards.db` (EDH).

**Auxiliary files**: `cards.db-wal`, `cards.db-shm`, `cards.db-journal`.

**Source**: `packages/extension/src/lifecycle/cardsApiLifecycle.ts`::`openDatabase()`.

| Pragma | Value | Purpose | Status |
|--------|-------|---------|--------|
| `locking_mode` | `NORMAL` | Allow concurrent reads while serializing writes | current |
| `busy_timeout` | `3000` | 3s retry on transient lock contention | current |
| `journal_mode` | `WAL` | Write-Ahead Logging for concurrent access | current |
| `synchronous` | `NORMAL` | Durability via WAL checkpoints, not per-transaction fsync | current |

### Corruption Recovery

On `SQLITE_CORRUPT`, `SQLITE_NOTADB`, `SQLITE_IOERR`, or FTS corruption (`vtable constructor failed`), the database is deleted and rebuilt from card repositories (Git repos are the source of truth). WAL/SHM/journal files are also cleaned up.

**Source**: `packages/extension/src/lifecycle/cardsApiLifecycle.ts`::`isDatabaseMalformed()`.

### Lock Conflicts

`SQLITE_BUSY` / `SQLITE_LOCKED` are NOT treated as corruption — they indicate a live server holds the write lock. The caller re-runs discovery and connects as client.

**Source**: `packages/extension/src/lifecycle/cardsApiLifecycle.ts`::`isDatabaseLocked()`.

## Recovery Constants

| Constant | Value | Purpose | Status |
|----------|-------|---------|--------|
| `RECOVERY_POLL_INTERVAL_MS` | 500 | Poll interval when waiting for recovery | current |
| `RECOVERY_POLL_TIMEOUT_MS` | 5000 | Max time to wait for another window's server | current |
| `HEALTH_CHECK_TIMEOUT_MS` | 3000 | Full HTTP health check timeout | current |
| `REACHABLE_HEALTH_TIMEOUT_MS` | 1000 | Health check for TCP-pre-probed reachable ports | current |
| `AMBIGUOUS_HEALTH_TIMEOUT_MS` | 200 | Health check for TCP-pre-probed ambiguous ports | current |

## Out of Scope

- Diagnostic procedures for server failures → `diagnose-server-health.md`
- EDH-specific path isolation → `platform-reference.md`
- Agent launch prerequisites (server must be running) → `diagnose-agent-launch.md`
- CLI authentication using discovery file → `inspect-cli-tools.md`
