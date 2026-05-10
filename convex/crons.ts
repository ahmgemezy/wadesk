import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process-due-followups",
  { minutes: 30 },
  internal.followUps.processDue,
);

crons.interval(
  "check-automation-timeouts",
  { minutes: 1 },
  internal.automations.checkNoReplyTimeouts,
);

crons.interval(
  "check-sla-breaches",
  { minutes: 5 },
  internal.sla.checkBreaches,
);

crons.interval(
  "sync-pending-broadcast-templates",
  { minutes: 30 },
  internal.broadcastTemplates.syncAllPendingInternal,
);

crons.interval(
  "process-scheduled-messages",
  { minutes: 1 },
  internal.messageScheduling.processScheduledMessages,
);

crons.interval(
  "process-channel-retention",
  { hours: 24 },
  internal.actions.channelRetentionAction.processChannelRetention,
);

crons.interval(
  "purge-old-notifications",
  { hours: 24 },
  internal.notifications.purgeOld,
);

crons.interval(
  "cleanup-incomplete-onboarding",
  { hours: 24 },
  internal.onboarding.cleanupIncompleteOrgs,
);

crons.interval(
  "purge-stale-rate-limits",
  { hours: 24 },
  internal.cleanup.purgeStaleRateLimits,
);

crons.interval(
  "process-scheduled-broadcasts",
  { minutes: 1 },
  internal.broadcasts.processScheduledBroadcastsInternal,
);

export default crons;
