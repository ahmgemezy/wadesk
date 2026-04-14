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

export default crons;
