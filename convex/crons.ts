import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process-due-followups",
  { minutes: 30 },
  internal.followUps.processDue,
);

export default crons;
