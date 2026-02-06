<instructions>

This document describes the environment variable system in `@cards/configuration`.

## Environment Variable Constants

The `CARDS_ENV_VARS` object provides the canonical names for all environment variables.

```typescript
import { CARDS_ENV_VARS } from '@cards/configuration';

// All environment variable names
CARDS_ENV_VARS.CARD_ID           // 'CARD_ID'
CARDS_ENV_VARS.ENVIRONMENT       // 'ENVIRONMENT'
CARDS_ENV_VARS.EXECUTION_MODE    // 'EXECUTION_MODE'
CARDS_ENV_VARS.API_BASE_URL      // 'API_BASE_URL'
CARDS_ENV_VARS.API_ACCESS_TOKEN  // 'API_ACCESS_TOKEN'
CARDS_ENV_VARS.CODING_AGENT      // 'CODING_AGENT'
CARDS_ENV_VARS.TYPE_NAME         // 'TYPE_NAME'
CARDS_ENV_VARS.TYPE_VERSION      // 'TYPE_VERSION'
CARDS_ENV_VARS.FILE_NAME         // 'FILE_NAME'
CARDS_ENV_VARS.FILE_PATH         // 'FILE_PATH'
CARDS_ENV_VARS.FILE_SIZE         // 'FILE_SIZE'
CARDS_ENV_VARS.SHA256            // 'SHA256'
CARDS_ENV_VARS.CONTENT_TYPE      // 'CONTENT_TYPE'
```

## Variable Availability

| Variable | Actions | Type Validators | Type Lifecycle |
|----------|---------|-----------------|----------------|
| `CARD_ID` | Yes | Yes | Yes |
| `ENVIRONMENT` | Yes | Yes | Yes |
| `EXECUTION_MODE` | Yes | No | No |
| `API_BASE_URL` | Yes | Yes | Yes |
| `API_ACCESS_TOKEN` | Yes | Yes | Yes |
| `CODING_AGENT` | Yes (optional) | No | No |
| `TYPE_NAME` | No | Yes | Yes |
| `TYPE_VERSION` | No | Yes | Yes |
| `FILE_NAME` | No | Yes | Yes |
| `FILE_PATH` | No | No | Yes |
| `FILE_SIZE` | No | No | Yes |
| `SHA256` | No | No | Yes |
| `CONTENT_TYPE` | No | Yes | Yes |

## Individual Getters

Each environment variable has a dedicated getter function with validation.

### Common Variables (All Handlers)

```typescript
import {
  getCardId,
  getEnvironment,
  getApiBaseUrl,
  getApiAccessToken
} from '@cards/configuration';

// All throw Error if missing or empty
const cardId = getCardId();
const environment = getEnvironment();
const apiBaseUrl = getApiBaseUrl();
const apiAccessToken = getApiAccessToken();
```

### Action-Specific Variables

```typescript
import { getExecutionMode, getCodingAgent } from '@cards/configuration';

// Throws if missing, returns 'interactive' | 'background'
const mode = getExecutionMode();

// Returns string | undefined (does not throw)
const codingAgent = getCodingAgent();
```

### Type Hook Variables

```typescript
import {
  getTypeName,
  getTypeVersion,
  getFileName,
  getFilePath,
  getFileSize,
  getSha256,
  getContentType
} from '@cards/configuration';

// All throw Error if missing or empty
const typeName = getTypeName();      // e.g., 'adaptive-card'
const typeVersion = getTypeVersion(); // e.g., '1.0.0'
const fileName = getFileName();       // e.g., 'card.json'
const filePath = getFilePath();       // e.g., '/path/to/card.json'
const contentType = getContentType(); // e.g., 'application/json'

// getFileSize parses and validates as number
const fileSize = getFileSize();       // e.g., 1234

// getSha256 returns hex string
const sha256 = getSha256();           // e.g., 'abc123...'
```

## Typed Input Extraction

For convenience, extract complete typed input objects.

### Action Input

```typescript
import { extractActionInput } from '@cards/configuration';

// Returns ActionStartInput with all action variables
const input = extractActionInput();
// {
//   cardId: string,
//   environment: string,
//   executionMode: 'interactive' | 'background',
//   apiBaseUrl: string,
//   apiAccessToken: string,
//   codingAgent?: string
// }
```

### Type Hook Input

```typescript
import { extractTypeInput } from '@cards/configuration';

// Returns TypeHookInput with all type hook variables
const input = extractTypeInput();
// {
//   cardId: string,
//   environment: string,
//   typeName: string,
//   typeVersion: string,
//   fileName: string,
//   filePath: string,
//   fileSize: number,
//   fileSha256: string,
//   contentType: string,
//   apiBaseUrl: string,
//   apiAccessToken: string
// }
```

## Error Handling

Getters throw descriptive errors when variables are missing:

```typescript
try {
  const cardId = getCardId();
} catch (error) {
  // Error: "Missing required environment variable: CARD_ID"
}

try {
  const mode = getExecutionMode();
} catch (error) {
  // Error: "Invalid EXECUTION_MODE: expected 'interactive' or 'background', got 'foo'"
}

try {
  const size = getFileSize();
} catch (error) {
  // Error: "Invalid FILE_SIZE: expected number, got 'not-a-number'"
}
```

## API Authentication

Use the extracted credentials for authenticated API calls:

```typescript
async (input, { logger }) => {
  // Make authenticated API call
  const response = await fetch(`${input.apiBaseUrl}/cards/${input.cardId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${input.apiAccessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  const data = await response.json();
  logger.info('Fetched card data', { cardId: input.cardId });
}
```

</instructions>
