import { PostHog } from "posthog-node";

type IdentifyEvent = Parameters<PostHog["identify"]>[0];
type CaptureEvent = Parameters<PostHog["capture"]>[0];
type CaptureExceptionArgs = Parameters<PostHog["captureException"]>;

class NoopPostHog {
  identify(_event: IdentifyEvent) {}
  capture(_event: CaptureEvent) {}
  captureException(..._args: CaptureExceptionArgs) {}
  async shutdown() {}
}

const posthogClient = process.env.POSTHOG_API_KEY
  ? new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST,
      enableExceptionAutocapture: true,
    })
  : new NoopPostHog();

export const posthog = posthogClient;

process.on("SIGINT", async () => {
  await posthog.shutdown();
});
process.on("SIGTERM", async () => {
  await posthog.shutdown();
});
