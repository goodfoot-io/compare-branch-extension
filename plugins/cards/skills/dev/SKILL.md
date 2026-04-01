---
name: dev
description: This skill should be used when the user asks to "take a screenshot of VS Code", "interact with the webview", "click a button in VS Code", "rebuild the extension", "reload the window", "list elements in the webview", "type into a webview input", "scroll the webview", "read webview text", "wait for an element", or needs to automate the main VS Code window webview using the cards-dev CLI. Covers screenshots, element interaction, DOM reading, and waiting for conditions.
---

<instructions>

## 1. Prerequisites

The `$CARDS_DEV_CLI` CLI connects to the running VS Code Electron process via CDP on port 19222. Verify connectivity before use:

```bash
curl -s --connect-timeout 2 "http://127.0.0.1:19222/json/version" | head -c 100
```

If this fails, VS Code is not exposing CDP. The CLI will throw a clear error.

## 2. CLI Reference

All commands output JSON to stdout and errors to stderr. Exit code 0 on success, 1 on failure. The `--target` flag selects which Cards webview to interact with:

- `detail` — The card detail editor panel (matched by `[data-timeline-kind]` content)
- `list` — The sidebar card list panel

```
$CARDS_DEV_CLI <subcommand> [flags]
```

### screenshot

Capture the full VS Code window or a specific webview body.

```bash
# Full window screenshot
$CARDS_DEV_CLI screenshot

# Card detail webview body
$CARDS_DEV_CLI screenshot --target detail

# Card list sidebar with custom output path
$CARDS_DEV_CLI screenshot --target list --output /tmp/list.png
```

Output: `{ "path": "/tmp/screenshot.png" }`

Flags: `--target detail|list` (optional), `--output <path>` (default: `/tmp/screenshot.png`)

### list-elements

Enumerate interactive elements (buttons, inputs, checkboxes, dropdowns) in a webview.

```bash
$CARDS_DEV_CLI list-elements --target detail
```

Output: JSON array of `{ tag, text, title, ariaLabel, type, disabled, checked }` objects.

Flags: `--target detail|list` (required)

### click

Click an element by matching its `textContent`, `title`, or `aria-label`.

```bash
# Click a button by label
$CARDS_DEV_CLI click --target detail --label "Create Comment"

# Click the second matching element
$CARDS_DEV_CLI click --target detail --label "Save" --index 1
```

Output: `{ "clicked": true, "element": { "tag": "BUTTON", "text": "Create Comment" } }`

Flags: `--target detail|list` (required), `--label <text>` (required), `--index <N>` (optional, 0-based)

### type

Type text into an input field found by placeholder, aria-label, or associated label.

```bash
# Type into an input, clearing existing value first
$CARDS_DEV_CLI type --target detail --label "Title" --text "New card title"

# Append text without clearing
$CARDS_DEV_CLI type --target detail --label "Search" --text " additional terms" --append
```

Output: `{ "typed": true, "element": { "tag": "INPUT", "label": "Title" } }`

Flags: `--target detail|list` (required), `--label <text>` (required), `--text <value>` (required), `--append` (optional boolean)

### scroll

Scroll a webview body or a specific container.

```bash
# Scroll the detail webview down by one viewport height
$CARDS_DEV_CLI scroll --target detail --direction down

# Scroll a specific container up by 200 pixels
$CARDS_DEV_CLI scroll --target detail --direction up --selector ".timeline-container" --amount 200
```

Output: `{ "scrolled": true, "scrollTop": 420 }`

Flags: `--target detail|list` (required), `--direction up|down` (required), `--selector <css>` (optional), `--amount <N>` (optional, default: viewport height)

### read

Read text content or attributes from the webview DOM.

```bash
# Read all visible text from the detail webview
$CARDS_DEV_CLI read --target detail

# Read text from specific elements
$CARDS_DEV_CLI read --target detail --selector "[data-timeline-kind]"

# Read a specific attribute from elements
$CARDS_DEV_CLI read --target detail --selector "[data-timeline-kind]" --attribute "data-timeline-kind"
```

Output (body): `{ "text": "..." }`
Output (selector): `{ "elements": [{ "text": "...", "tag": "DIV", "attributes": {...} }] }`

Flags: `--target detail|list` (required), `--selector <css>` (optional), `--attribute <name>` (optional)

### wait

Wait for an element or text to appear (or disappear) in the webview.

```bash
# Wait for a selector to appear
$CARDS_DEV_CLI wait --target detail --selector "[data-timeline-kind]"

# Wait for text to disappear with custom timeout
$CARDS_DEV_CLI wait --target detail --text "Loading" --absent --timeout 10000
```

Output: `{ "found": true, "elapsed": 1200 }`

Flags: `--target detail|list` (required), `--selector <css>` or `--text <text>` (one required), `--absent` (optional boolean — wait for disappearance), `--timeout <N>` (optional, default: 5000ms)

## 3. Typical Workflows

### Verify a UI change after rebuild

```bash
yarn build
```

Reload the window, wait for the webview to settle, then screenshot:

```bash
$CARDS_DEV_CLI wait --target detail --selector "[data-timeline-kind]" --timeout 15000
$CARDS_DEV_CLI screenshot --target detail --output /tmp/after-rebuild.png
```

### Discover and click a button

```bash
# List all interactive elements to find the right label
$CARDS_DEV_CLI list-elements --target detail

# Click the desired button
$CARDS_DEV_CLI click --target detail --label "Create Comment"
```

### Read DOM state for assertions

```bash
# Read timeline entry types
$CARDS_DEV_CLI read --target detail --selector "[data-timeline-kind]" --attribute "data-timeline-kind"
```

</instructions>
