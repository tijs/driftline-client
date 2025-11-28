# Driftline Client

TypeScript client for
[Driftline Analytics](https://github.com/tijs/driftline-analytics) - anonymous
analytics for ATProto app views.

## Installation

```typescript
// Deno / JSR
import { AnalyticsClient, deriveUidFromDid } from "@tijs/driftline-client";

// Or via URL
import {
  AnalyticsClient,
  deriveUidFromDid,
} from "https://deno.land/x/driftline_client/mod.ts";
```

## Usage

```typescript
import { AnalyticsClient, deriveUidFromDid } from "@tijs/driftline-client";

// Derive anonymous user ID from DID (use your app-specific salt)
const uid = await deriveUidFromDid(user.did, YOUR_APP_SALT);

const analytics = new AnalyticsClient({
  appView: "kipclip.com",
  env: "prod",
  collectorUrl: "https://driftline.val.run",
  apiKey: YOUR_API_KEY,
  uid,
});

// Track account creation (once per user)
await analytics.trackAccountCreated();

// Track screen views
await analytics.trackView("HomeScreen");

// Track actions
await analytics.trackAction("checkin_created", "CheckinScreen", {
  placeType: "cafe",
});
```

## API

### `deriveUidFromDid(did: string, salt: string): Promise<string>`

Derives a pseudonymous 12-character hex user ID from a DID using SHA-256.

- Same DID + salt always produces the same uid
- Different salts produce different uids (for cross-app-view privacy)
- Server never sees the original DID

### `AnalyticsClient`

#### Constructor

```typescript
new AnalyticsClient({
  appView: string;      // Your app view identifier
  env: "dev" | "prod";  // Environment
  collectorUrl: string; // Driftline server URL
  apiKey: string;       // Your API key
  uid: string;          // User ID from deriveUidFromDid
})
```

#### Methods

- `trackAccountCreated(props?)` - Track account creation (once per user)
- `trackView(screen, props?)` - Track screen impressions
- `trackAction(name, screen?, props?)` - Track user actions

## License

MIT
