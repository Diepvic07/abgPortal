import { PostHog } from "posthog-node";

let posthogClient: PostHog | null | undefined;

// Server-side PostHog client factory
// flushAt: 1 and flushInterval: 0 ensure events are sent immediately
// without paying the cost of per-request shutdown.
export function getPostHogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    return null;
  }

  if (posthogClient) {
    return posthogClient;
  }

  posthogClient = new PostHog(token, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogClient;
}

export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  const client = getPostHogClient();
  client?.capture({
    distinctId,
    event,
    properties,
  });
}
