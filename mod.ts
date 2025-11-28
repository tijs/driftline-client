/**
 * @module
 *
 * Driftline Analytics Client - anonymous analytics for ATProto app views.
 *
 * @example Basic usage
 * ```ts
 * import { AnalyticsClient, deriveUidFromDid } from "@tijs/driftline-client";
 *
 * // Derive anonymous user ID from DID
 * const uid = await deriveUidFromDid(user.did, "your-app-secret-salt");
 *
 * const analytics = new AnalyticsClient({
 *   appView: "kipclip.com",
 *   env: "prod",
 *   collectorUrl: "https://driftline.val.run",
 *   apiKey: "your-api-key",
 *   uid,
 * });
 *
 * // Track events
 * await analytics.trackAccountCreated();
 * await analytics.trackView("HomeScreen");
 * await analytics.trackAction("checkin_created", "CheckinScreen", { placeType: "cafe" });
 * ```
 */

/**
 * Environment type for analytics events.
 * Use "dev" for development/testing, "prod" for production.
 */
export type Environment = "dev" | "prod";

/**
 * Type of analytics event.
 * - `account` - Track account creation (once per user)
 * - `view` - Track screen/page impressions
 * - `action` - Track user actions (clicks, submissions, etc.)
 */
export type EventType = "account" | "view" | "action";

/**
 * Analytics event payload sent to the collector.
 */
export type AnalyticsEvent = {
  /** Event schema version, always 1 */
  v: 1;
  /** App view identifier (e.g., "kipclip.com") */
  appView: string;
  /** Environment: "dev" or "prod" */
  env: Environment;
  /** ISO 8601 timestamp */
  ts: string;
  /** Pseudonymous user ID (12-char hex) */
  uid: string;
  /** Event type */
  type: EventType;
  /** Event name (e.g., "account_created", "screen_impression", "checkin_created") */
  name: string;
  /** Screen/page name (optional) */
  screen?: string;
  /** Additional properties (optional) */
  props?: Record<string, unknown>;
};

/**
 * Configuration for the AnalyticsClient.
 *
 * @example
 * ```ts
 * const config: AnalyticsClientConfig = {
 *   appView: "kipclip.com",
 *   env: "prod",
 *   collectorUrl: "https://driftline.val.run",
 *   apiKey: "your-api-key",
 *   uid: "a1b2c3d4e5f6",
 * };
 * ```
 */
export type AnalyticsClientConfig = {
  /** App view identifier (e.g., "kipclip.com") */
  appView: string;
  /** Environment: "dev" or "prod" */
  env: Environment;
  /** Driftline collector URL */
  collectorUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Pseudonymous user ID from {@link deriveUidFromDid} */
  uid: string;
};

/**
 * Client for sending analytics events to Driftline.
 *
 * @example
 * ```ts
 * import { AnalyticsClient, deriveUidFromDid } from "@tijs/driftline-client";
 *
 * const uid = await deriveUidFromDid(user.did, "your-salt");
 *
 * const analytics = new AnalyticsClient({
 *   appView: "kipclip.com",
 *   env: "prod",
 *   collectorUrl: "https://driftline.val.run",
 *   apiKey: "your-api-key",
 *   uid,
 * });
 *
 * await analytics.trackView("HomeScreen");
 * await analytics.trackAction("button_clicked", "HomeScreen", { buttonId: "submit" });
 * ```
 */
export class AnalyticsClient {
  /**
   * Create a new AnalyticsClient instance.
   *
   * @param cfg - Client configuration
   */
  constructor(private cfg: AnalyticsClientConfig) {}

  private createEvent(
    type: EventType,
    name: string,
    screen?: string,
    props?: Record<string, unknown>,
  ): AnalyticsEvent {
    const event: AnalyticsEvent = {
      v: 1,
      appView: this.cfg.appView,
      env: this.cfg.env,
      ts: new Date().toISOString(),
      uid: this.cfg.uid,
      type,
      name,
    };

    if (screen) {
      event.screen = screen;
    }

    if (props && Object.keys(props).length > 0) {
      event.props = props;
    }

    return event;
  }

  private async send(event: AnalyticsEvent): Promise<void> {
    const url = this.cfg.collectorUrl.replace(/\/$/, "") + "/collect";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.cfg.apiKey,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "Unknown error",
        }));
        console.error("[driftline] Failed to send event:", error);
      }
    } catch (err) {
      console.error("[driftline] Network error:", err);
    }
  }

  /**
   * Track when an account is first created/registered for this app view.
   * Should only be called once per user.
   *
   * @param props - Optional additional properties
   *
   * @example
   * ```ts
   * await analytics.trackAccountCreated();
   * await analytics.trackAccountCreated({ referrer: "twitter" });
   * ```
   */
  async trackAccountCreated(props?: Record<string, unknown>): Promise<void> {
    const event = this.createEvent(
      "account",
      "account_created",
      undefined,
      props,
    );
    await this.send(event);
  }

  /**
   * Track a screen/view impression.
   *
   * @param screen - Screen or page name
   * @param props - Optional additional properties
   *
   * @example
   * ```ts
   * await analytics.trackView("HomeScreen");
   * await analytics.trackView("ProfileScreen", { userId: "123" });
   * ```
   */
  async trackView(
    screen: string,
    props?: Record<string, unknown>,
  ): Promise<void> {
    const event = this.createEvent("view", "screen_impression", screen, props);
    await this.send(event);
  }

  /**
   * Track a user action.
   *
   * @param name - Action name (e.g., "checkin_created", "button_clicked")
   * @param screen - Optional screen where the action occurred
   * @param props - Optional additional properties
   *
   * @example
   * ```ts
   * await analytics.trackAction("checkin_created");
   * await analytics.trackAction("checkin_created", "CheckinScreen");
   * await analytics.trackAction("checkin_created", "CheckinScreen", { placeType: "cafe" });
   * ```
   */
  async trackAction(
    name: string,
    screen?: string,
    props?: Record<string, unknown>,
  ): Promise<void> {
    const event = this.createEvent("action", name, screen, props);
    await this.send(event);
  }
}

/**
 * Derive a pseudonymous user ID from a DID using SHA-256.
 *
 * The same DID + salt will always produce the same uid.
 * Different salts (per app view) produce different uids for the same DID,
 * preventing cross-app-view tracking.
 *
 * @param did - The user's DID (e.g., "did:plc:...")
 * @param salt - App-specific salt (keep secret, store in env vars)
 * @returns 12-character hex string
 *
 * @example
 * ```ts
 * const uid = await deriveUidFromDid("did:plc:abc123", "my-secret-salt");
 * // Returns something like "a1b2c3d4e5f6"
 * ```
 */
export async function deriveUidFromDid(
  did: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(salt + did);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 12);
}
