<code-references>

When a description mentions a workspace file, function, or code location, use a markdown fragment link instead of a backtick code span. The card-detail webview renders these as clickable buttons that open the file in the editor.

**File references**: `[src/auth/provider.ts](./src/auth/provider.ts)`
**Line-anchored references**: `[src/auth/provider.ts L42](./src/auth/provider.ts#L42)` or `[src/auth/provider.ts L42–L58](./src/auth/provider.ts#L42-L58)`
**Function references**: anchor the name to its definition site, e.g. `[startCardsApi()](./packages/extension/src/lifecycle/cardsApiLifecycle.ts#L42)`

Only workspace-relative paths benefit from fragment linking. References to non-workspace paths (e.g. `~/.cards/cards-api.json`) or external URLs should remain as plain text or backtick code spans.

</code-references>
