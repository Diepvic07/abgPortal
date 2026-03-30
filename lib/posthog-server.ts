import { PostHog } from "posthog-node";

// Server-side PostHog client factory
// flushAt: 1 and flushInterval: 0 ensure events are sent immediately
// (important for short-lived Next.js API routes)
export function getPostHogClient(): PostHog {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}
