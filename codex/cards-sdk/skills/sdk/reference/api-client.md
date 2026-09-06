<instructions>

Programmatic access to the Cards API from a handler, via `@cards.management/sdk/client/discovery`.

## Creating a Client

`createCardsClient(logger?, options?)` discovers the running server, then returns a configured `CardsClient` — or `null` when discovery fails. Always branch on `null`; a handler must not assume the API is reachable.

```typescript
import { createCardsClient } from '@cards.management/sdk/client/discovery';

async (input, { logger }) => {
  const client = await createCardsClient(logger);

  if (!client) {
    logger.warn('Cards API not available');
    return;
  }

  const card = await client.getCard(input.cardId);
}
```

`options` is merged over the discovered `baseUrl`/`accessToken`. Short-lived callers should pass `{ retryOnNetworkError: false }` so an unreachable server raises `NetworkError` promptly instead of retrying:

```typescript
const client = await createCardsClient(logger, { retryOnNetworkError: false });
```

`discoverApiInfo(logger?)` is exported from the same subpath when you need the raw host/port/token rather than a client.

## Client Methods

All are `async` and throw on HTTP failure.

| Group | Methods |
|-------|---------|
| Cards | `listCards`, `listCardSummaries`, `getCard`, `createCard`, `updateCard`, `deleteCard` |
| Attachments | `uploadAttachment`, `getAttachment`, `listAttachments` |
| Files & gates | `putFile`, `approveGate` (`'plan' \| 'mergeRequest'`) |
| Commits & branches | `getCommits`, `addCommit`, `removeCommit`, `getBranches`, `addBranch`, `removeBranch` |
| Streams | `listStreams`, `getStream` |
| Workspace | `getTags`, `getEnvironments`, `getTypeSchemas`, `getTimeline`, `executeAction` |
| Compare | `setCompare`, `getCompare`, `clearCompare` |

Non-async accessors: `updateAccessToken(token)`, `getBaseUrl()`, `hasHttpClient()`.

`listStreams(cardId)` returns `StreamMeta[]` — the same shape renderers receive; see [streams.md](streams.md).

</instructions>
