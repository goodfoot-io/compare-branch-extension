# Diagnosing Server Health Issues

Scope: server not responding, "Server not running" errors, discovery file problems, database corruption. Agent-retrieval keywords: server health, cards-api.json, discovery file, ENOENT, ECONNREFUSED, SQLITE_CORRUPT, SQLITE_BUSY, port not responding, PID dead, stale discovery, recovery poll.

Cross-refs: `cards-api-server.md` (discovery file schema, database settings, liveness states), `diagnose-agent-launch.md` (server prerequisite for agent commands), `find-logs.md` (server startup errors in VS Code output).

Parent: `../SKILL.md`

## Evidence to Collect

Before diagnosing, gather:
- VS Code Output → Cards channel content (last 100 lines)
- `~/.cards/cards-api.json` file contents (run `cat ~/.cards/cards-api.json | jq .`)
- PID from discovery file (`jq -r '.pid' ~/.cards/cards-api.json`)
- `ps aux | grep <pid>` output (if PID present)
- `~/.cards/cards.db` file size and modification time

## Quick Diagnostics

```bash
# Discovery file snapshot
cat ~/.cards/cards-api.json 2>/dev/null | jq '{port, pid, host, buildTime}' || echo "discovery file missing"

# PID liveness
PID=$(jq -r '.pid // empty' ~/.cards/cards-api.json 2>/dev/null)
[ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && echo "alive" || echo "dead or absent"

# HTTP health
PORT=$(jq -r '.port // empty' ~/.cards/cards-api.json 2>/dev/null)
TOKEN=$(jq -r '.accessToken // empty' ~/.cards/cards-api.json 2>/dev/null)
[ -n "$PORT" ] && curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:$PORT/health" 2>/dev/null
```

## Failure Modes

Based on discovery file + PID + TCP probe + health check result. Schema details in `cards-api-server.md`.

### Server Never Started

**Evidence**: Discovery file missing. No `[CardsApi]` startup log in VS Code Output → Cards channel.

- **If EDH mode**: Check `~/.cards/edh/{edhId}/storage/cards-api.json` instead.
- **If fresh install**: Run the setup wizard. The extension must activate at least once.
- **If reload didn't help**: Check the extension host log for activation errors.
- **Safe**: Reading discovery file, curl health check, reviewing logs. **Risky**: Deleting the database file (only if malformed — see below).

**Post-fix verification**: `cat ~/.cards/cards-api.json` shows valid JSON. `curl http://127.0.0.1:<port>/health` returns 2xx.

### Stale Discovery File (PID Dead)

**Evidence**: Discovery file present, PID dead (`kill -0` fails). Server process crashed or was killed.

**Recovery**: Reload the VS Code window. The extension's recovery polling (500ms interval, 5s timeout) will detect the stale file, clean it up, and take over ownership.

**Risk**: **Safe**. Reloading triggers the recovery path — no manual file deletion needed. Do NOT manually `rm ~/.cards/cards-api.json` — a peer window may have already taken over.

**Post-fix verification**: Discovery file has a new PID (different from old). Server responds to health check.

### Stale PID (Port Dead but PID Alive)

**Evidence**: Discovery file present, PID alive, but TCP pre-probe returns `dead` (ECONNREFUSED / ECONNRESET). The PID was recycled by the OS — a different process now has that PID.

**Recovery**: Reload the VS Code window. The stale detection will find the definitively dead port and clean up the discovery file.

**Looks like, but isn't**: A server under extreme CPU load may appear similar to a dead port. The TCP pre-probe uses a 50ms idle timeout — if the server is genuinely alive but slow, it returns `timeout` (not `dead`) and falls through to a 200ms HTTP health check.

**Risk**: **Safe**. **Escalate if**: reload doesn't resolve after 3 attempts — the port may be held by another process. Check `lsof -i :<port>`.

### Database Corruption

**Evidence**: Server log contains `SQLITE_CORRUPT`, `SQLITE_NOTADB`, `disk I/O error`, or `vtable constructor failed`. Server may start but operations fail.

**Recovery**: Automatic. The database is deleted and rebuilt from card repositories (Git repos are the source of truth). No user action required.

**Risk**: **Risky to intervene**. Do NOT manually delete `cards.db` while a server is running — SQLITE_BUSY is a liveness signal, not corruption. If you see `database is locked`, a live server holds the write lock.

**Post-fix verification**: Server responds to health check. Card operations succeed.

### Database Locked (Another Server Running)

**Evidence**: `SQLITE_BUSY` or `database is locked`. This is a liveness signal — only an active connection can hold a SQLite lock.

**Recovery**: Do not delete the database. The `checkExistingServer()` function re-runs discovery and connects as client if a live server is found. If discovery says no server, the lock may be from a crashed process — reload the window.

**Risk**: **Risky — do NOT delete the database file**. This is the "don't delete on lock conflict" rule. A false-positive from `checkExistingServer()` (main-190) means "no owner found + lock conflict" is ambiguous.

**Escalate if**: Database remains locked after window reload + 10s wait. Check for orphaned SQLite processes: `lsof | grep cards.db`.

### Server Running but Unreachable from CLI

**Evidence**: Server responds to `curl` health check from the terminal but CLI commands fail.

**Diagnose**: Check the CLI's workspace resolution. `git rev-parse --show-toplevel` must return the workspace registered with the server. Override with `--workspace-path`.

**Escalate if**: `cards-extension workspace list` returns empty or doesn't include the expected workspace.

## Escalation

File via `cards-extension issue`. Load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template and evidence collection) before filing.

Escalate if any of these are true:
- **Server won't start after 3 window reloads**: Include the last 100 lines of the Cards output channel and `find ~/.vscode-server/data/logs -name 'Cards.log' -exec tail -50 {} \;`.
- **Database corruption recurs after rebuild**: Include `ls -la ~/.cards/cards.db*` and the server startup log showing the corruption error.
- **Port conflict persists across reloads**: Include `lsof -i :<port>` output and the discovery file contents.
- **Discovery file oscillates (created/deleted rapidly)**: Include `tail -100 ${WORKSPACE}/.cards/logs/claude-code-cards-api-hooks.log` and `ls -la ~/.cards/cards-api.json*`.
