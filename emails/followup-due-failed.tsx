import { FollowupDue } from "../convex/emails/templates/followupDue";

export default function FollowupDueFailedPreview() {
  return <FollowupDue locale="en" variables={{ contactName: "Layla", status: "failed", appUrl: "#" }} />;
}
