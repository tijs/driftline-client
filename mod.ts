/**
 * Driftline Analytics Client
 *
 * TypeScript client for tracking analytics events from ATProto app views.
 *
 * Usage:
 *   const uid = await deriveUidFromDid(user.did, YOUR_APP_SALT);
 *   const analytics = new AnalyticsClient({
 *     appView: "xyz.kipclip.feed",
 *     env: "prod",
 *     collectorUrl: "https://driftline.val.run",
 *     apiKey: YOUR_API_KEY,
 *     uid,
 *   });
 *
 *   await analytics.trackAccountCreated();
 *   await analytics.trackView("HomeScreen");
 *   await analytics.trackAction("checkin_created", "CheckinScreen", { placeType: "cafe" });
 */

export type Environment = "dev" | "prod";
export type EventType = "account" | "view" | "action";

export type AnalyticsEvent = {
  v: 1;
  appView: string;
  env: Environment;
  ts: string;
  uid: string;
  type: EventType;
  name: string;
  screen?: string;
  props?: Record<string, unknown>;
};

export type AnalyticsClientConfig = {
  appView: string;
  env: Environment;
  collectorUrl: string;
  apiKey: string;
  uid: string;
};

export class AnalyticsClient {
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
 * Derive a pseudonymous user ID from a DID.
 * The same DID + salt will always produce the same uid.
 * Different salts (per app view) produce different uids for the same DID.
 *
 * @param did - The user's DID (e.g., "did:plc:...")
 * @param salt - App-specific salt (keep secret, store in env vars)
 * @returns 12-character hex string
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
